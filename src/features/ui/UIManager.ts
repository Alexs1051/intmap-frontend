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
import { logger } from "../../core/logger/Logger";

const uiLogger = logger.getLogger('UIManager');

export class UIManager {
  private static _instance: UIManager;
  private _scene: Scene | null = null;
  private _cameraManager: CameraManager | null = null;
  private _buildingManager: BuildingManager | null = null;
  private _markerManager: MarkerManager | null = null;
  
  private _controlPanel: ControlPanel | null = null;
  private _connectionScreen: ConnectionScreen;
  private _loadingScreen: LoadingScreen;
  private _fpsCounter: FPSCounter;
  private _searchBar: SearchBar;
  private _popupManager: PopupManager;
  private _markerDetailsPanel: MarkerDetailsPanel;

  private _currentViewMode: 'building' | 'floor' = 'building';
  private _wallsTransparent: boolean = false;
  private _showFPS: boolean = true;
  private _isLoading: boolean = true;

  private constructor() {
    this._connectionScreen = new ConnectionScreen();
    this._loadingScreen = new LoadingScreen();
    this._searchBar = new SearchBar();
    this._popupManager = PopupManager.getInstance();
    this._markerDetailsPanel = new MarkerDetailsPanel();

    this._markerDetailsPanel.setCloseCallback(() => {
      this._markerManager?.clearSelection();
    });
    
    uiLogger.debug("UIManager создан");
  }

  public static getInstance(): UIManager {
    if (!UIManager._instance) {
      UIManager._instance = new UIManager();
    }
    return UIManager._instance;
  }

  public initialize(scene: Scene, cameraManager: CameraManager, buildingManager: BuildingManager): void {
    this._scene = scene;
    this._cameraManager = cameraManager;
    this._buildingManager = buildingManager;
    this._markerManager = MarkerManager.getInstance(scene);
    
    this._controlPanel = new ControlPanel(cameraManager.modeManager);
    
    this.setupEventListeners();
    this.setupSearchHandlers();
    
    setTimeout(() => {
      this.updateButtonStates();
      this.updateFloorButtons();
    }, 100);

    this._markerManager.setOnMarkerSelected((marker: Marker | null) => {
      marker ? this._markerDetailsPanel.show(marker) : this._markerDetailsPanel.hide();
    });

    this._markerDetailsPanel.setFocusCallback((marker: Marker) => {
      uiLogger.info(`Фокус на метку: ${marker.data.title}`);
      this._cameraManager?.focusOnPoint(marker.position, 8, 1.2);
      this.showInfo(`Фокус на ${marker.data.title}`);
    });
    
    uiLogger.info("UIManager полностью инициализирован");
  }

  private setupEventListeners(): void {
    if (!this._controlPanel || !this._cameraManager) return;
    
    this._controlPanel.addEventListener(async (event: UIEvent) => {
      if (!this._cameraManager!.canInteractWithUI()) return;

      uiLogger.debug(`UI Event: ${UIEventType[event.type]}`);

      const handlers: Record<UIEventType, () => Promise<void> | void> = {
        [UIEventType.SEARCH_TOGGLE]: () => this.toggleSearch(),
        [UIEventType.CAMERA_MODE_TOGGLE]: () => this._cameraManager!.toggleCameraMode(),
        [UIEventType.RESET_CAMERA]: () => this._cameraManager!.resetCamera(),
        [UIEventType.VIEW_MODE_TOGGLE]: () => this.toggleViewMode(),
        [UIEventType.WALLS_TRANSPARENCY_TOGGLE]: () => this.toggleWallsTransparency(),
        [UIEventType.NEXT_FLOOR]: () => this.nextFloor(),
        [UIEventType.PREVIOUS_FLOOR]: () => this.previousFloor()
      };

      await handlers[event.type]?.();
      this.updateButtonStates();
      this.updateFloorButtons();
    });
  }

  private setupSearchHandlers(): void {
    this._searchBar.setSearchCallback((query: string) => {
      uiLogger.debug(`Поиск: ${query}`);
      const markers = this._markerManager?.getAllMarkers() || [];
      const results = markers
        .filter(m => m.data.title.toLowerCase().includes(query.toLowerCase()))
        .map(m => ({
          id: m.id,
          name: m.data.title,
          type: m.type,
          icon: m.data.icon,
          floor: m.data.floor,
          marker: m
        }));
      
      this._searchBar.showResults(results);
    });

    this._searchBar.setCloseCallback(() => uiLogger.debug("Поиск закрыт"));
    this._searchBar.setResultClickCallback((result) => {
      if (result.marker) {
        this._markerManager?.focusOnMarker(result.marker);
        this._markerDetailsPanel.show(result.marker);
      }
    });
  }

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

  private toggleViewMode(): void {
    if (!this._buildingManager || !this._cameraManager) return;
    
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
  }

  private nextFloor(): void {
    if (!this._buildingManager) return;
    
    const floorManager = this._buildingManager.floorManager;
    const currentFloor = floorManager.currentFloor;
    const maxFloor = floorManager.maxFloor;
    
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
    
    this._controlPanel.updateButtonState('2d', this._cameraManager.cameraMode === CameraMode.MODE_2D);
    this._controlPanel.updateButtonState('walls', this._wallsTransparent);
    this._controlPanel.updateButtonState('view', this._currentViewMode === 'floor');
  }

  private updateFloorButtons(): void {
    if (!this._controlPanel || !this._buildingManager) return;
    
    const floorManager = this._buildingManager.floorManager;
    const maxFloor = floorManager.maxFloor;
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
    
    this._controlPanel = null;
    this._scene = null;
    this._cameraManager = null;
    this._buildingManager = null;
    
    uiLogger.info("UIManager уничтожен");
  }

  public get isLoading(): boolean {
    return this._isLoading;
  }
}