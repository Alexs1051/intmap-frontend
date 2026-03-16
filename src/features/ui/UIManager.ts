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
import { UIEvent, UIEventType, CameraMode } from "../../shared/types";

export class UIManager {
  private static _instance: UIManager;
  private _scene: Scene | null = null;
  private _cameraManager: CameraManager | null = null;
  private _buildingManager: BuildingManager | null = null;
  private _markerManager: MarkerManager | null = null;
  
  // UI Components
  private _controlPanel: ControlPanel | null = null;
  private _connectionScreen: ConnectionScreen;
  private _loadingScreen: LoadingScreen;
  private _fpsCounter: FPSCounter;
  private _searchBar: SearchBar;
  private _popupManager: PopupManager;
  private _markerDetailsPanel: MarkerDetailsPanel;

  // Состояния
  private _currentViewMode: 'building' | 'floor' = 'building';
  private _wallsTransparent: boolean = false;
  private _showFPS: boolean = true;
  private _isLoading: boolean = true;

  private constructor() {
    // Инициализируем базовые UI компоненты
    this._connectionScreen = new ConnectionScreen();
    this._loadingScreen = new LoadingScreen();
    this._searchBar = new SearchBar();
    this._popupManager = PopupManager.getInstance();
    this._markerDetailsPanel = new MarkerDetailsPanel();

    this._markerDetailsPanel.setCloseCallback(() => {
      if (this._markerManager) {
        this._markerManager.clearSelection();
      }
    });
    
    console.log("UIManager created with basic UI components");
  }

  public static getInstance(): UIManager {
    if (!UIManager._instance) {
      UIManager._instance = new UIManager();
    }
    return UIManager._instance;
  }

  /**
   * Инициализация с зависимостями (вызывается после создания Scene)
   */
  public initialize(scene: Scene, cameraManager: CameraManager): void {
    this._scene = scene;
    this._cameraManager = cameraManager;
    this._buildingManager = BuildingManager.getInstance(scene);
    this._markerManager = MarkerManager.getInstance(scene);
    
    // Создаём ControlPanel (зависит от cameraManager)
    this._controlPanel = new ControlPanel(cameraManager.modeManager);
    
    // Настраиваем обработчики
    this.setupEventListeners();
    this.setupSearchHandlers();
    
    // Принудительно обновляем состояние кнопок при инициализации
    setTimeout(() => {
      this.updateButtonStates();
      this.updateFloorButtons(); // Это заблокирует кнопки этажей
      console.log("🔄 Начальное состояние кнопок обновлено");
    }, 100);

    this._markerManager = MarkerManager.getInstance(scene);
    this._markerManager.setOnMarkerSelected((marker: Marker) => {
      if (marker) {
        this._markerDetailsPanel.show(marker);
      } else {
        this._markerDetailsPanel.hide();
      }
    });

    this._markerDetailsPanel.setFocusCallback((marker: Marker) => {
      console.log(`🎯 Фокус на метку из панели: ${marker.data.title}`);
      
      // Вызываем focusOnMarker через MarkerManager
      if (this._markerManager) {
        this._markerManager.focusOnMarker(marker, {
          distance: 8,
          duration: 1.2
        });
        
        // Показываем уведомление
        this.showInfo(`Фокус на ${marker.data.title}`);
      } else {
        console.warn("MarkerManager не инициализирован");
      }
    });
    
    console.log("UIManager fully initialized with all components");
  }

  private setupEventListeners(): void {
    if (!this._controlPanel || !this._cameraManager) return;
    
    this._controlPanel.addEventListener(async (event: UIEvent) => {
      if (!this._cameraManager!.canInteractWithUI()) {
        console.log("UI interaction blocked - camera is animating");
        return;
      }

      console.log(`UI Event: ${UIEventType[event.type]}`);

      switch (event.type) {
        case UIEventType.SEARCH_TOGGLE:  // Добавить этот case
          this.toggleSearch();
          break;
          
        case UIEventType.CAMERA_MODE_TOGGLE:
          await this._cameraManager!.toggleCameraMode();
          break;
          
        case UIEventType.RESET_CAMERA:
          await this._cameraManager!.resetCamera();
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
      }
      
      this.updateButtonStates();
      this.updateFloorButtons();
    });
  }

  private setupSearchHandlers(): void {
    this._searchBar.setSearchCallback((query: string) => {
      console.log(`Searching for: ${query}`);
      
      const mockResults = [
        { id: '1', name: 'Офис 101', type: 'marker' },
        { id: '2', name: 'Этаж 3', type: 'floor' },
        { id: '3', name: 'Главное здание', type: 'building' },
        { id: '4', name: 'Конференц-зал', type: 'marker' },
        { id: '5', name: 'Столовая', type: 'marker' },
      ].filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase())
      );
      
      this._searchBar.showResults(mockResults);
    });

    this._searchBar.setCloseCallback(() => {
      console.log("Search closed");
    });
  }

  /**
   * Показать экран загрузки
   */
  public showLoading(status: string = 'Загрузка...'): void {
    this._isLoading = true;
    this._loadingScreen.show();
    this._loadingScreen.setStatus(status);
  }

  /**
   * Обновить прогресс загрузки
   */
  public updateLoadingProgress(progress: number, status?: string): void {
    this._loadingScreen.updateProgress(progress);
    if (status) {
      this._loadingScreen.setStatus(status);
    }
  }

  /**
   * Скрыть экран загрузки
   */
  public hideLoading(): void {
    this._isLoading = false;
    this._loadingScreen.hide();
  }

  /**
   * Показать экран соединения
   */
  public showConnection(reason: string = 'Соединение прервано'): void {
    this._connectionScreen.show(reason);
  }

  /**
   * Показать ошибку соединения
   */
  public showConnectionError(reason: string = 'Ошибка соединения'): void {
    this._connectionScreen.showError(reason);
  }

  /**
   * Скрыть экран соединения
   */
  public hideConnection(): void {
    this._connectionScreen.hide();
  }

  /**
   * Установить колбэк для повторной попытки соединения
   */
  public setRetryCallback(callback: () => void): void {
    this._connectionScreen.setRetryCallback(callback);
  }

  /**
   * Включить/выключить отображение FPS
   */
  public toggleFPS(show?: boolean): void {
    if (show !== undefined) {
      this._showFPS = show;
    } else {
      this._showFPS = !this._showFPS;
    }
  }

  /**
   * Обновить FPS (вызывать каждый кадр)
   */
  public updateFPS(): void {
    if (this._showFPS) {
      this._fpsCounter.update();
    }
  }

  /**
   * Показать/скрыть поиск
   */
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

  public showError(message: string, duration: number = 8000): void { // Ошибки дольше
    this._popupManager.error(message, duration);
  }

  public showWarning(message: string, duration: number = 6000): void { // Предупреждения тоже подольше
    this._popupManager.warning(message, duration);
  }

  private toggleViewMode(): void {
    if (!this._buildingManager || !this._cameraManager) return;
    
    this._currentViewMode = this._currentViewMode === 'building' ? 'floor' : 'building';
    
    if (this._currentViewMode === 'building') {
      console.log("🏢 Показываю все этажи");
      this._buildingManager.floorManager.showAllFloors();
      this.showInfo('Режим: всё здание');
    } else {
      const currentFloor = this._cameraManager.currentFloor;
      console.log(`📌 Показываю этаж ${currentFloor}`);
      this._buildingManager.floorManager.showFloor(currentFloor);
      this.showInfo(`Этаж ${currentFloor}`);
    }
    
    this.updateButtonStates();
    this.updateFloorButtons();
  }

  private toggleWallsTransparency(): void {
    if (!this._buildingManager) return;
    
    this._wallsTransparent = !this._wallsTransparent;
    this._buildingManager.wallManager.setTransparency(this._wallsTransparent);
    this.showInfo(
      this._wallsTransparent ? 'Стены прозрачные' : 'Стены непрозрачные'
    );
  }

  private nextFloor(): void {
    if (!this._cameraManager || !this._buildingManager) return;
    
    this._cameraManager.nextFloor();
    const currentFloor = this._cameraManager.currentFloor;
    
    if (this._currentViewMode === 'floor') {
      this._buildingManager.floorManager.showFloor(currentFloor);
    }
    
    this.showSuccess(`Этаж ${currentFloor}`, 3000); // Для успеха оставим поменьше
    this.updateFloorButtons();
  }

  private previousFloor(): void {
    if (!this._cameraManager || !this._buildingManager) return;
    
    this._cameraManager.previousFloor();
    const currentFloor = this._cameraManager.currentFloor;
    
    if (this._currentViewMode === 'floor') {
      this._buildingManager.floorManager.showFloor(currentFloor);
    }
    
    this.showSuccess(`Этаж ${currentFloor}`, 3000);
    this.updateFloorButtons();
  }

  private updateButtonStates(): void {
    if (!this._controlPanel || !this._cameraManager) return;
    
    this._controlPanel.updateButtonState('2d', this._cameraManager.cameraMode === CameraMode.MODE_2D);
    this._controlPanel.updateButtonState('walls', this._wallsTransparent);
    this._controlPanel.updateButtonState('view', this._currentViewMode === 'floor');
  }

  private updateFloorButtons(): void {
    if (!this._controlPanel || !this._buildingManager || !this._cameraManager) return;
    
    const maxFloor = this._buildingManager.floorManager.floorCount;
    const currentFloor = this._cameraManager.currentFloor;
    
    // В режиме здания передаём 0, чтобы заблокировать кнопки
    // В режиме этажа передаём номер текущего этажа
    this._controlPanel.updateFloorButtons(
      this._currentViewMode === 'floor' ? currentFloor : 0,
      maxFloor
    );
  }

  /**
   * Очистить все UI компоненты
   */
  public dispose(): void {
    if (this._controlPanel) {
      this._controlPanel.dispose();
    }
    this._connectionScreen.dispose();
    this._loadingScreen.dispose();
    this._fpsCounter.dispose();
    this._searchBar.dispose();
    
    this._controlPanel = null;
    this._scene = null;
    this._cameraManager = null;
    this._buildingManager = null;
    
    console.log("UIManager fully disposed");
  }

  // Геттеры
  public get isLoading(): boolean {
    return this._isLoading;
  }
}