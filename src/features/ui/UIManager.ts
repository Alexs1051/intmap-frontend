import { Scene } from "@babylonjs/core";
import { CameraManager } from "../camera/CameraManager";
import { BuildingManager } from "../building/BuildingManager";
import { MarkerManager } from "../markers/MarkerManager";
import { Marker } from "../markers/Marker";
import { ControlPanel } from "./components/ControlPanel";
import { ConnectionScreen } from "./components/ConnectionScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { FPSCounter } from "./components/FPSCounter";
import { SearchBar } from "./components/SearchBar";
import { PopupManager } from "./components/PopupManager";
import { MarkerDetailsPanel } from "./components/MarkerDetailsPanel";
import { BuildingTitle } from "./components/BuildingTitle";
import { AuthPopup, AuthResult } from "./components/AuthPopup";
import { UIEvent, UIEventType, CameraMode } from "../../shared/types";
import { logger } from "../../core/logger/Logger";
import { RouteResult } from "../markers/MarkerManager";

const uiLogger = logger.getLogger('UIManager');

export class UIManager {
  private static _instance: UIManager;
  private _scene: Scene | null = null;
  private _cameraManager: CameraManager | null = null;
  private _buildingManager: BuildingManager | null = null;
  private _markerManager: MarkerManager | null = null;
  private _fromMarker: Marker | null = null;
  private _toMarker: Marker | null = null;
  private _currentRoute: RouteResult | null = null;
  private _fromMarkerId: string | null = null; // ID метки отправления
  private _toMarkerId: string | null = null; 
  
  private _controlPanel: ControlPanel | null = null;
  private _connectionScreen: ConnectionScreen;
  private _loadingScreen: LoadingScreen;
  private _fpsCounter: FPSCounter;
  private _searchBar: SearchBar;
  private _popupManager: PopupManager;
  private _markerDetailsPanel: MarkerDetailsPanel;
  private _buildingTitle: BuildingTitle;
  private _authPopup: AuthPopup;

  private _currentViewMode: 'building' | 'floor' = 'building';
  private _wallsTransparent: boolean = false;
  private _showFPS: boolean = true;
  private _isLoading: boolean = true;
  
  private _isAuthenticated: boolean = false;
  private _userRole: string = '';

  private constructor() {
    this._connectionScreen = new ConnectionScreen();
    this._loadingScreen = new LoadingScreen();
    this._searchBar = new SearchBar();
    this._popupManager = PopupManager.getInstance();
    this._markerDetailsPanel = new MarkerDetailsPanel();
    this._buildingTitle = new BuildingTitle('Test Building');
    this._authPopup = new AuthPopup();

    this._markerDetailsPanel.setCloseCallback(() => {
      this._markerManager?.clearSelection();
    });

    this._authPopup.setAuthCallback((result: AuthResult) => {
      if (result.success) {
        this._isAuthenticated = true;
        this._userRole = result.role || '';
        this._controlPanel?.setAuthState({
          isAuthenticated: true,
          username: result.username,
          role: result.role
        });
        this.showSuccess(`Добро пожаловать, ${result.username}`);
      } else {
        this._isAuthenticated = false;
        this._userRole = '';
        this._controlPanel?.setAuthState({
          isAuthenticated: false
        });
        this.showInfo('Вы вышли из системы');
      }
    });
    
    uiLogger.debug("UIManager создан");
  }

  public static getInstance(): UIManager {
    if (!UIManager._instance) {
      UIManager._instance = new UIManager();
    }
    return UIManager._instance;
  }

  public initialize(scene: Scene, cameraManager: CameraManager): void {
    this._scene = scene;
    this._cameraManager = cameraManager;
    this._buildingManager = BuildingManager.getInstance(scene);
    this._markerManager = MarkerManager.getInstance(scene);
    
    this._controlPanel = new ControlPanel(cameraManager.modeManager);
    
    this.setupEventListeners();
    this.setupSearchHandlers();
    this.setupRouteCallbacks();
    
    setTimeout(() => {
      this.updateButtonStates();
      this.updateFloorButtons();
    }, 100);

    this._markerManager.setOnMarkerSelected((marker: Marker | null) => {
      if (marker) {
        // Перед показом панели устанавливаем правильное состояние кнопок
        if (this._fromMarkerId === marker.id) {
          this._markerDetailsPanel.updateFromState(true);
        } else {
          this._markerDetailsPanel.updateFromState(false);
        }
        
        if (this._toMarkerId === marker.id) {
          this._markerDetailsPanel.updateToState(true);
        } else {
          this._markerDetailsPanel.updateToState(false);
        }
        
        this._markerDetailsPanel.show(marker);
      } else {
        this._markerDetailsPanel.hide();
      }
    });

    this._markerDetailsPanel.setFocusCallback((marker: Marker) => {
      uiLogger.info(`Фокус на метку: ${marker.data.name}`);
        this._markerManager?.focusOnMarker(marker, { distance: 8, duration: 1.2 });
    });
    
    uiLogger.info("UIManager полностью инициализирован");
  }

  private setupEventListeners(): void {
    if (!this._controlPanel) return;
    
    this._controlPanel.addEventListener(async (event: UIEvent) => {
      uiLogger.debug(`Получено UI событие: ${UIEventType[event.type]}`);

      switch (event.type) {
        case UIEventType.SEARCH_TOGGLE:
          this.toggleSearch();
          break;
          
        case UIEventType.AUTH_TOGGLE:
          if (this._isAuthenticated) {
            this._authPopup.showLogoutConfirmation();
          } else {
            this._authPopup.show();
          }
          break;
          
        case UIEventType.CAMERA_MODE_TOGGLE:
          await this.toggleCameraMode();
          break;
          
        case UIEventType.RESET_CAMERA:
          await this.resetCamera();
          break;
          
        case UIEventType.VIEW_MODE_TOGGLE:
          this.toggleViewMode();
          break;
          
        case UIEventType.WALLS_TRANSPARENCY_TOGGLE:
          this.toggleWallsTransparency();
          break;
          
        case UIEventType.NEXT_FLOOR:
          this.nextFloor();
          break;
          
        case UIEventType.PREVIOUS_FLOOR:
          this.previousFloor();
          break;

        case UIEventType.TOGGLE_GRAPH:
          this.toggleGraph();
          break;
      }
    });
  }

  private toggleGraph(): void {
    if (this._markerManager) {
      this._markerManager.toggleGraph();
      this.showInfo(this._markerManager.isGraphVisible ? 'Граф показан' : 'Граф скрыт');
    }
  }

  private setupSearchHandlers(): void {
    // Передаём MarkerManager в SearchBar
    this._searchBar.setMarkerManager(this._markerManager);
    
    this._searchBar.setSearchCallback((query: string) => {
      uiLogger.debug(`Поиск: ${query}`);
    });

    this._searchBar.setResultClickCallback((result) => {
      if (result.marker && this._markerManager) {
        uiLogger.info(`Фокус на маркер из поиска: ${result.name}`);
        
        // Фокусируемся на маркере
        this._markerManager.focusOnMarker(result.marker, { distance: 8, duration: 1.0 });
        
        // Выделяем маркер
        this._markerManager.clearSelection();
        result.marker.setSelected(true);
        
        // Показываем детали маркера
        this._markerDetailsPanel.show(result.marker);
        
        this.showInfo(`Фокус на ${result.name}`);
      }
    });

    this._searchBar.setCloseCallback(() => uiLogger.debug("Поиск закрыт"));
  }

  // ===== Публичные методы для UI =====

  public showLoading(status: string = 'Загрузка...'): void {
    this._isLoading = true;
    this._loadingScreen.show();
    this._loadingScreen.setStatus(status);
  }

  public updateLoadingProgress(progress: number, status?: string): void {
    this._loadingScreen.updateProgress(progress);
    if (status) this._loadingScreen.setStatus(status);
  }

  public hideLoading(): void {
    this._isLoading = false;
    this._loadingScreen.hide();
  }

  public showConnection(reason: string = 'Соединение прервано'): void {
    this._connectionScreen.show(reason);
  }

  public showConnectionError(reason: string = 'Ошибка соединения'): void {
    this._connectionScreen.showError(reason);
  }

  public hideConnection(): void {
    this._connectionScreen.hide();
  }

  public setRetryCallback(callback: () => void): void {
    this._connectionScreen.setRetryCallback(callback);
  }

  public toggleFPS(show?: boolean): void {
    this._showFPS = show ?? !this._showFPS;
  }

  public updateFPS(): void {
    if (this._showFPS) this._fpsCounter.update();
  }

  public toggleSearch(): void {
    this._searchBar.toggle();
  }

  public showNotification(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', duration: number = 5000): void {
    this._popupManager.show({ message, type, duration });
  }

  public showInfo(message: string, duration: number = 5000): void {
    this._popupManager.info(message, duration);
  }

  public showSuccess(message: string, duration: number = 5000): void {
    this._popupManager.success(message, duration);
  }

  public showError(message: string, duration: number = 8000): void {
    this._popupManager.error(message, duration);
  }

  public showWarning(message: string, duration: number = 6000): void {
    this._popupManager.warning(message, duration);
  }

  // ===== Приватные методы для обработки действий =====

  private async toggleCameraMode(): Promise<void> {
    if (!this._cameraManager) {
      uiLogger.warn("CameraManager не инициализирован");
      return;
    }
    
    uiLogger.debug("Переключение режима камеры");
    await this._cameraManager.toggleCameraMode();
    this.updateButtonStates();
  }

  private async resetCamera(): Promise<void> {
    if (!this._cameraManager) {
      uiLogger.warn("CameraManager не инициализирован");
      return;
    }
    
    uiLogger.debug("Сброс камеры");
    await this._cameraManager.resetCamera();
  }

  private async focusOnMarker(marker: Marker): Promise<void> {
    if (!this._cameraManager) {
      uiLogger.warn("CameraManager не инициализирован");
      return;
    }
    
    uiLogger.info(`Фокус на метку: ${marker.data.name}`);
    await this._cameraManager.focusOnPoint(marker.position, 8, 1.2);
    this.showInfo(`Фокус на ${marker.data.name}`);
  }

  private toggleViewMode(): void {
    if (!this._buildingManager) return;
    
    const floorManager = this._buildingManager.floorManager;
    this._currentViewMode = this._currentViewMode === 'building' ? 'floor' : 'building';
    
    if (this._currentViewMode === 'building') {
      floorManager.showAllFloors();
      this.showInfo('Режим: всё здание');
    } else {
      const currentFloor = floorManager.currentFloor;
      floorManager.showFloor(currentFloor);
      this.showInfo(`Этаж ${currentFloor}`);
    }
    
    this.updateButtonStates();
    this.updateFloorButtons();
  }

  private toggleWallsTransparency(): void {
    if (!this._buildingManager) return;
    
    this._wallsTransparent = !this._wallsTransparent;
    this._buildingManager.wallManager.setTransparency(this._wallsTransparent);
    this.showInfo(this._wallsTransparent ? 'Стены прозрачные' : 'Стены непрозрачные');
    this.updateButtonStates();
  }

  private nextFloor(): void {
    if (!this._buildingManager) return;
    
    const floorManager = this._buildingManager.floorManager;
    const currentFloor = floorManager.currentFloor;
    const maxFloor = floorManager.floorCount;
    
    if (currentFloor < maxFloor) {
      const nextFloor = currentFloor + 1;
      floorManager.showFloor(nextFloor);
      this.showSuccess(`Этаж ${nextFloor}`, 3000);
      this.updateFloorButtons();
    }
  }

  private previousFloor(): void {
    if (!this._buildingManager) return;
    
    const floorManager = this._buildingManager.floorManager;
    const currentFloor = floorManager.currentFloor;
    
    if (currentFloor > 1) {
      const prevFloor = currentFloor - 1;
      floorManager.showFloor(prevFloor);
      this.showSuccess(`Этаж ${prevFloor}`, 3000);
      this.updateFloorButtons();
    }
  }

  private updateButtonStates(): void {
    if (!this._controlPanel || !this._cameraManager) return;
    
    this._controlPanel.updateButtonState('mode', this._cameraManager.cameraMode === CameraMode.MODE_2D);
    this._controlPanel.updateButtonState('walls', this._wallsTransparent);
    this._controlPanel.updateButtonState('view', this._currentViewMode === 'floor');
  }

  private updateFloorButtons(): void {
    if (!this._controlPanel || !this._buildingManager) return;
    
    const floorManager = this._buildingManager.floorManager;
    const maxFloor = floorManager.floorCount;
    const currentFloor = floorManager.currentFloor;
    
    this._controlPanel.updateFloorButtons(
      this._currentViewMode === 'floor' ? currentFloor : 0,
      maxFloor
    );
  }

  public dispose(): void {
    this._controlPanel?.dispose();
    this._connectionScreen.dispose();
    this._loadingScreen.dispose();
    this._fpsCounter.dispose();
    this._searchBar.dispose();
    this._markerDetailsPanel.dispose();
    this._buildingTitle.dispose();
    this._authPopup.dispose();
    
    this._controlPanel = null;
    this._scene = null;
    this._cameraManager = null;
    this._buildingManager = null;
    this._markerManager = null;
    
    uiLogger.info("UIManager уничтожен");
  }

  public get isLoading(): boolean {
    return this._isLoading;
  }

  private setupRouteCallbacks(): void {
    if (!this._markerDetailsPanel) {
      uiLogger.error("MarkerDetailsPanel не инициализирован");
      return;
    }

    this._markerDetailsPanel.setRouteCallbacks(
      (marker: Marker, type: 'from') => {
        uiLogger.debug(`Route callback: from - ${marker.data.name}`);
        this.setFromMarker(marker);
      },
      (marker: Marker, type: 'to') => {
        uiLogger.debug(`Route callback: to - ${marker.data.name}`);
        this.setToMarker(marker);
      }
    );
    
    uiLogger.debug("Route callbacks установлены");
  }

  // Добавить методы для управления маршрутом:
  private setFromMarker(marker: Marker): void {
    const markerId = marker.id;
    
    if (this._fromMarkerId === markerId) {
      // Снимаем выделение
      this._fromMarkerId = null;
      this._markerDetailsPanel.updateFromState(false);
      this.clearRoute();
    } else {
      // Устанавливаем новую точку отправления
      this._fromMarkerId = markerId;
      this._markerDetailsPanel.updateFromState(true);
      
      // Если уже выбрана точка назначения - строим маршрут
      if (this._toMarkerId) {
        this.calculateAndShowRoute();
      }
    }
  }

  private setToMarker(marker: Marker): void {
    const markerId = marker.id;
    
    if (this._toMarkerId === markerId) {
      // Снимаем выделение
      this._toMarkerId = null;
      this._markerDetailsPanel.updateToState(false);
      this.clearRoute();
    } else {
      // Устанавливаем новую точку назначения
      this._toMarkerId = markerId;
      this._markerDetailsPanel.updateToState(true);
      
      // Если уже выбрана точка отправления - строим маршрут
      if (this._fromMarkerId) {
        this.calculateAndShowRoute();
      }
    }
  }

  private calculateAndShowRoute(): void {
    if (!this._fromMarkerId || !this._toMarkerId || !this._markerManager) {
      uiLogger.warn("Не удалось построить маршрут: недостаточно данных");
      return;
    }

    const fromMarker = this._markerManager.getMarker(this._fromMarkerId);
    const toMarker = this._markerManager.getMarker(this._toMarkerId);
    
    if (!fromMarker || !toMarker) {
      uiLogger.warn("Не удалось построить маршрут: маркеры не найдены");
      return;
    }

    uiLogger.info(`Поиск маршрута от ${fromMarker.data.name} до ${toMarker.data.name}`);
    
    // Проверим связность через BFS
    const isReachable = this._markerManager.graph.isReachable(fromMarker.id, toMarker.id);
    uiLogger.info(`Граф: ${isReachable ? '✅ связный' : '❌ НЕ связный'}`);
    
    // Найдём путь через BFS для отладки
    const bfsPath = this._markerManager.graph.bfsPath(fromMarker.id, toMarker.id);
    if (bfsPath) {
      const pathNames = bfsPath.map(id => this._markerManager.getMarker(id)?.name).join(' → ');
      uiLogger.info(`BFS путь: ${pathNames}`);
    } else {
      uiLogger.warn(`BFS путь не найден`);
    }
    
    const result = this._markerManager.findPath(fromMarker, toMarker);

    if (result) {
      this.showRoute(result);
    } else {
      this.showError('Маршрут не найден');
      this.clearRoute();
    }
  }

  private showRoute(result: PathResult): void {
    // Очищаем предыдущий маршрут
    this.clearRoute();
    
    this._currentRoute = result;
    
    // Подсвечиваем путь в графе
    this._markerManager?.highlightPath(result.path);
    
    // Получаем позиции всех точек маршрута
    const positions = result.path.map(m => m.position);
    
    // Плавно отдаляем камеру, чтобы показать весь маршрут
    if (this._cameraManager) {
      // Используем плавный переход с промежуточной точкой для лучшего эффекта
      this._cameraManager.focusOnRoute(positions, 1.5).catch(err => 
        uiLogger.error('Ошибка при фокусе на маршрут', err)
      );
    }
    
    // Показываем информацию о маршруте
    const fromName = this._fromMarker?.name || 'A';
    const toName = this._toMarker?.name || 'B';
    
    const distanceM = result.totalDistance.toFixed(1);
    
    this.showInfo(
      `Маршрут от ${fromName} до ${toName}: ${distanceM}м, ${result.path.length} точек`
    );
    
    uiLogger.info('Маршрут построен', {
      from: this._fromMarker?.id,
      to: this._toMarker?.id,
      distance: result.totalDistance,
      nodes: result.nodesVisited
    });
  }

  private clearRoute(): void {
    this._currentRoute = null;
    this._markerManager?.clearPathHighlight();
  }
}