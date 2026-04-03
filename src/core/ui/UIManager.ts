import { injectable, inject } from "inversify";
import { Scene } from "@babylonjs/core";
import { TYPES } from "../di/Container";
import { Logger } from "../logger/Logger";
import { EventBus } from "../events/EventBus";
import { UIFactory } from "./UIFactory";
import { UIEventType, NotificationType, SearchResult, PathNode } from "../../shared/types";
import { Marker } from "../../features/markers/Marker";
import { EventType } from "../events/EventTypes";
import { 
    IAuthPopup, 
    IBuildingManager, 
    IBuildingTitle, 
    ICameraManager, 
    IConnectionScreen, 
    IControlPanel, 
    IFPSCounter, 
    IMarkerDetailsPanel, 
    IMarkerManager, 
    IPopupManager, 
    ISearchBar, 
    IUIManager, 
    UIManagerDependencies,
    IMarker
} from "@shared/interfaces";

@injectable()
export class UIManager implements IUIManager {
  private logger: Logger;
  private eventBus: EventBus;
  private factory: UIFactory;
  
  private cameraManager?: ICameraManager;
  private buildingManager?: IBuildingManager;
  private markerManager?: IMarkerManager;
  
  private controlPanel?: IControlPanel;
  private searchBar?: ISearchBar;
  private popupManager?: IPopupManager;
  private markerDetailsPanel?: IMarkerDetailsPanel;
  private connectionScreen?: IConnectionScreen;
  private fpsCounter?: IFPSCounter;
  private buildingTitle?: IBuildingTitle;
  private authPopup?: IAuthPopup;
  
  private _isLoading: boolean = false;
  private _showFPS: boolean = true;
  private _currentTheme: 'light' | 'dark' = 'dark';
  
  private fromMarkerId: string | null = null;
  private toMarkerId: string | null = null;

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.EventBus) eventBus: EventBus,
    @inject(TYPES.UIFactory) factory: UIFactory
  ) {
    this.logger = logger.getLogger('UIManager');
    this.eventBus = eventBus;
    this.factory = factory;
    
    this.logger.debug("UIManager created");
  }

  public initialize(_scene: Scene, dependencies: UIManagerDependencies): void {
    this.cameraManager = dependencies.cameraManager;
    this.buildingManager = dependencies.buildingManager;
    this.markerManager = dependencies.markerManager;

    console.log('UIManager.initialize: markerManager =', this.markerManager);
    
    this.createUIComponents();
    
    if (this.markerManager) {
        console.log('MarkerManager set in UIManager');
        
        if (this.searchBar) {
            console.log('Setting MarkerManager to SearchBar');
            this.searchBar.setMarkerManager(this.markerManager);
        }
        
        this.eventBus.on(EventType.MARKERS_LOADED, () => {
            console.log('MARKERS_LOADED event received');
            this.searchBar?.refreshMarkers();
        });
    }

    this.setupCallbacks();
    this.loadTheme();

    this.eventBus.on(EventType.LOADING_ERROR, (data: any) => {
        const errorMessage = data.error?.message || data.error || data.message || "Неизвестная ошибка";
        this.showError(`Ошибка загрузки: ${errorMessage}`);
    });
    
    this.logger.info("UIManager initialized");
  }

  private createUIComponents(): void {
    console.log('Creating UI components...');
    
    this.controlPanel = this.factory.createControlPanel();
    console.log('ControlPanel created');
    
    this.searchBar = this.factory.createSearchBar();
    console.log('SearchBar created');
    
    this.popupManager = this.factory.createPopupManager();
    this.markerDetailsPanel = this.factory.createMarkerDetailsPanel();
    this.connectionScreen = this.factory.createConnectionScreen();
    this.fpsCounter = this.factory.createFPSCounter();
    this.buildingTitle = this.factory.createBuildingTitle();
    this.authPopup = this.factory.createAuthPopup();
    
    console.log('All UI components created');
    
    setTimeout(() => {
      const controlPanelEl = document.querySelector('.control-panel');
      const searchOverlay = document.querySelector('.search-overlay');
      console.log('ControlPanel in DOM:', !!controlPanelEl);
      console.log('SearchBar in DOM:', !!searchOverlay);
    }, 100);
  }

  private setupCallbacks(): void {
    this.controlPanel?.addEventListener((event: any) => {
      this.handleControlPanelEvent(event);
    });
    
    // ✅ Исправляем: получаем маркер из IMarkerManager по ID
    this.searchBar?.setResultClickCallback((result: SearchResult) => {
      if (result.id && this.markerManager) {
        const marker = this.markerManager.getMarker(result.id);
        if (marker) {
          this.markerManager.focusOnMarker(marker.id, { distance: 8, duration: 1.0 });
          this.markerManager.setSelectedMarker(marker);
          // ✅ markerDetailsPanel.show ожидает Marker, но IMarkerManager возвращает IMarker
          // Приводим к типу any для обхода (оба типа совместимы по структуре)
          this.markerDetailsPanel?.show(marker as any);
        }
      }
    });
    
    this.markerDetailsPanel?.setRouteCallbacks(
      (marker: Marker) => this.setFromMarker(marker),
      (marker: Marker) => this.setToMarker(marker)
    );
    
    this.markerDetailsPanel?.setFocusCallback((marker: Marker) => {
      this.markerManager?.focusOnMarker(marker.id, { distance: 8, duration: 1.2 });
    });
    
    // ✅ Исправляем: используем IMarker тип
    this.markerManager?.setOnMarkerSelected((marker: IMarker | null) => {
      if (marker) {
        this.markerDetailsPanel?.updateFromState(this.fromMarkerId === marker.id);
        this.markerDetailsPanel?.updateToState(this.toMarkerId === marker.id);
        this.markerDetailsPanel?.show(marker as any);
      } else {
        this.markerDetailsPanel?.hide();
      }
    });
  }

  private handleControlPanelEvent(event: { type: UIEventType; floor?: number }): void {
    switch (event.type) {
        case UIEventType.SEARCH_TOGGLE:
            this.searchBar?.toggle();
            break;
        case UIEventType.AUTH_TOGGLE:
            this.authPopup?.show();
            break;
        case UIEventType.CAMERA_MODE_TOGGLE:
            this.cameraManager?.toggleCameraMode();
            break;
        case UIEventType.RESET_CAMERA:
            this.cameraManager?.resetCamera();
            break;
        case UIEventType.TOGGLE_GRAPH:
            this.markerManager?.toggleGraph();
            break;
        case UIEventType.TOGGLE_THEME:
            this.toggleTheme();
            break;
        case UIEventType.TOGGLE_WALL_TRANSPARENCY:
            this.toggleWallTransparency();
            break;
        case UIEventType.TOGGLE_VIEW_MODE:
            this.toggleViewMode();
            break;
        case UIEventType.NEXT_FLOOR:
            this.nextFloor();
            break;
        case UIEventType.PREV_FLOOR:
            this.prevFloor();
            break;
        default:
            this.logger.debug(`Unhandled UI event: ${event.type}`);
    }
  }

  private toggleWallTransparency(): void {
      if (this.buildingManager) {
          this.buildingManager.toggleWallTransparency();
          const isTransparent = this.buildingManager.wallManager.isTransparent;
          this.showInfo(isTransparent ? 'Прозрачность стен включена' : 'Прозрачность стен выключена');
      } else {
          this.logger.warn('BuildingManager not available');
      }
  }

  private toggleViewMode(): void {
      if (this.buildingManager) {
          this.buildingManager.floorManager.toggleViewMode();
          const mode = this.buildingManager.floorManager.getViewMode();
          const message = mode === 'single' ? 'Режим: отдельный этаж' : 'Режим: всё здание';
          this.showInfo(message);
      } else {
          this.logger.warn('BuildingManager not available');
      }
  }

  private nextFloor(): void {
      if (this.buildingManager) {
          const floorManager = this.buildingManager.floorManager;
          const currentMode = floorManager.getViewMode();
          const currentFloor = floorManager.currentFloor;
          const maxFloor = floorManager.maxFloor;
          
          if (currentMode === 'all') {
              floorManager.setViewMode('single');
              floorManager.showFloor(floorManager.minFloor);
          } else if (currentFloor < maxFloor) {
              floorManager.showFloor(currentFloor + 1);
          }
      }
  }

  private prevFloor(): void {
      if (this.buildingManager) {
          const floorManager = this.buildingManager.floorManager;
          const currentMode = floorManager.getViewMode();
          const currentFloor = floorManager.currentFloor;
          const minFloor = floorManager.minFloor;
          
          if (currentMode === 'all') {
              floorManager.setViewMode('single');
              floorManager.showFloor(floorManager.maxFloor);
          } else if (currentFloor > minFloor) {
              floorManager.showFloor(currentFloor - 1);
          }
      }
  }

  private setFromMarker(marker: Marker): void {
    const markerId = marker.id;
    
    if (this.fromMarkerId === markerId) {
      this.fromMarkerId = null;
      this.markerDetailsPanel?.updateFromState(false);
      marker.setAsFromMarker(false);
      this.clearRoute();
    } else {
      if (this.fromMarkerId) {
        const oldMarker = this.markerManager?.getMarker(this.fromMarkerId);
        oldMarker?.setAsFromMarker(false);
      }
      this.fromMarkerId = markerId;
      this.markerDetailsPanel?.updateFromState(true);
      marker.setAsFromMarker(true);
      
      if (this.toMarkerId) {
        this.calculateAndShowRoute();
      }
    }
  }

  private setToMarker(marker: Marker): void {
    const markerId = marker.id;
    
    if (this.toMarkerId === markerId) {
      this.toMarkerId = null;
      this.markerDetailsPanel?.updateToState(false);
      marker.setAsToMarker(false);
      this.clearRoute();
    } else {
      if (this.toMarkerId) {
        const oldMarker = this.markerManager?.getMarker(this.toMarkerId);
        oldMarker?.setAsToMarker(false);
      }
      this.toMarkerId = markerId;
      this.markerDetailsPanel?.updateToState(true);
      marker.setAsToMarker(true);
      
      if (this.fromMarkerId) {
        this.calculateAndShowRoute();
      }
    }
  }

  private calculateAndShowRoute(): void {
    if (!this.fromMarkerId || !this.toMarkerId || !this.markerManager) return;
    
    const result = this.markerManager.findPath(this.fromMarkerId, this.toMarkerId);
    
    if (result && result.found) {
        const pathIds = result.path.map((p: PathNode) => p.markerId);
        this.markerManager.highlightPath(pathIds);
        const distance = result.totalDistance.toFixed(1);
        this.showInfo(`Маршрут: ${distance}м, ${result.path.length} точек`);
        
        if (this.cameraManager) {
            const positions = result.path.map((p: PathNode) => p.position);
            this.cameraManager.focusOnRoute(positions, 1.5);
        }
    } else {
        this.showError('Маршрут не найден');
        this.clearRoute();
    }
  }

  private clearRoute(): void {
    this.markerManager?.clearPathHighlight();
  }

  private toggleTheme(): void {
    const newTheme = this._currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  // === Публичные методы ===

  public showLoading(status: string): void {
    this._isLoading = true;
    console.log(`[Loading] ${status}`);
  }

  public updateLoadingProgress(progress: number, status?: string): void {
    console.log(`[Loading] ${Math.round(progress * 100)}% - ${status}`);
  }

  public hideLoading(): void {
    this._isLoading = false;
  }

  public showNotification(message: string, type: NotificationType, duration: number = 5000): void {
    this.popupManager?.show({ message, type, duration });
  }

  public showInfo(message: string, duration: number = 5000): void {
    this.popupManager?.info(message, duration);
  }

  public showSuccess(message: string, duration: number = 5000): void {
    this.popupManager?.success(message, duration);
  }

  public showError(message: string, duration: number = 8000): void {
    this.popupManager?.error(message, duration);
  }

  public showWarning(message: string, duration: number = 6000): void {
    this.popupManager?.warning(message, duration);
  }

  public showConnection(reason: string = 'Соединение прервано'): void {
    this.connectionScreen?.show(reason);
  }

  public showConnectionError(reason: string = 'Ошибка соединения'): void {
    this.connectionScreen?.showError(reason);
  }

  public hideConnection(): void {
    this.connectionScreen?.hide();
  }

  public setRetryCallback(callback: () => void): void {
    this.connectionScreen?.setRetryCallback(callback);
  }

  public toggleSearch(): void {
    this.searchBar?.toggle();
  }

  public updateFPS(): void {
    if (this._showFPS) {
      this.fpsCounter?.update();
    }
  }

  public toggleFPS(show?: boolean): void {
      this._showFPS = show ?? !this._showFPS;
      if (this.fpsCounter && typeof (this.fpsCounter as any).setVisible === 'function') {
          (this.fpsCounter as any).setVisible(this._showFPS);
      }
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this._currentTheme = theme;
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.classList.add('theme-light');
      this.controlPanel?.setDarkTheme(false);
    } else {
      root.classList.remove('theme-light');
      this.controlPanel?.setDarkTheme(true);
    }
    
    localStorage.setItem('theme', theme);
  }

  public loadTheme(): void {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    this.setTheme(savedTheme || 'dark');
  }

  public dispose(): void {
    this.controlPanel?.dispose();
    this.searchBar?.dispose();
    this.popupManager?.dispose();
    this.markerDetailsPanel?.dispose();
    this.connectionScreen?.dispose();
    this.fpsCounter?.dispose();
    this.buildingTitle?.dispose();
    this.authPopup?.dispose();
    this.logger.info("UIManager disposed");
  }

  public get isLoading(): boolean {
    return this._isLoading;
  }
}