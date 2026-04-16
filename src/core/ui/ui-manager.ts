import { injectable, inject } from "inversify";
import { Scene } from "@babylonjs/core";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { UIFactory } from "./ui-factory";
import { RouteManager } from "@core/route/route-manager";
import { UIEventType, NotificationType, SearchResult } from "@shared/types";
import { Marker } from "@features/markers/marker";
import { EventType } from "@core/events/event-types";
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
  private routeManager: RouteManager;

  private cameraManager?: ICameraManager;
  private buildingManager?: IBuildingManager;
  private markerManager?: IMarkerManager;

  public controlPanel?: IControlPanel;
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
  private floorButtonLockTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.EventBus) eventBus: EventBus,
    @inject(TYPES.UIFactory) factory: UIFactory,
    @inject(TYPES.RouteManager) routeManager: RouteManager
  ) {
    this.logger = logger.getLogger('UIManager');
    this.eventBus = eventBus;
    this.factory = factory;
    this.routeManager = routeManager;

    this.logger.debug("UIManager created");
  }

  public initialize(_scene: Scene, dependencies: UIManagerDependencies): void {
    this.cameraManager = dependencies.cameraManager;
    this.buildingManager = dependencies.buildingManager;
    this.markerManager = dependencies.markerManager;

    // Set dependencies for RouteManager
    if (this.markerManager && this.cameraManager) {
      this.routeManager.setDependencies(this.markerManager, this.cameraManager);
    }

    this.logger.debug('UIManager.initialize: markerManager =', this.markerManager);

    this.createUIComponents();

    if (this.markerManager) {
      this.logger.debug('MarkerManager set in UIManager');

      if (this.searchBar) {
        this.logger.debug('Setting MarkerManager to SearchBar');
        this.searchBar.setMarkerManager(this.markerManager);
      }

      this.eventBus.on(EventType.MARKERS_LOADED, () => {
        this.logger.debug('MARKERS_LOADED event received');
        this.searchBar?.refreshMarkers();
      });
    }

    this.setupCallbacks();
    this.setupEventBusListeners();
    this.loadTheme();
    this.syncControlModeButton(false);
    this.refreshFloorButtons();

    this.eventBus.on(EventType.LOADING_ERROR, (data: any) => {
      const errorMessage = data.error?.message || data.error || data.message || "Неизвестная ошибка";
      this.showError(`Ошибка загрузки: ${errorMessage}`);
    });

    this.logger.info("UIManager initialized");
  }

  private createUIComponents(): void {
    this.logger.debug('Creating UI components...');

    this.controlPanel = this.factory.createControlPanel();
    this.logger.debug('ControlPanel created');

    this.searchBar = this.factory.createSearchBar();
    this.logger.debug('SearchBar created');

    this.popupManager = this.factory.createPopupManager();
    this.markerDetailsPanel = this.factory.createMarkerDetailsPanel();
    this.connectionScreen = this.factory.createConnectionScreen();
    this.fpsCounter = this.factory.createFPSCounter();
    this.buildingTitle = this.factory.createBuildingTitle();
    this.authPopup = this.factory.createAuthPopup();

    this.logger.debug('All UI components created');

    setTimeout(() => {
      const controlPanelEl = document.querySelector('.control-panel');
      const searchOverlay = document.querySelector('.search-overlay');
      this.logger.debug('ControlPanel in DOM:', !!controlPanelEl);
      this.logger.debug('SearchBar in DOM:', !!searchOverlay);
    }, 100);
  }

  private setupEventBusListeners(): void {
    this.eventBus.on(EventType.FLOOR_CHANGED, (event) => {
      const floor = event.data?.floor;
      if (floor !== undefined && this.markerManager) {
        this.markerManager.setCurrentFloor(floor);
        this.logger.debug(`Floor changed to ${floor}`);
      }
      this.refreshFloorButtons();
    });

    this.eventBus.on(EventType.FLOOR_EXPAND_CHANGED, (event) => {
      const expanded = event.data?.expanded;
      this.logger.debug(`Floor expand state changed to: ${expanded}`);
    });

    this.eventBus.on(EventType.GRAPH_VISIBILITY_CHANGED, (event) => {
      this.logger.debug(`Graph visibility changed to ${event.data?.visible}`);
    });

    this.eventBus.on(EventType.ROUTE_CLEARED, () => {
      this.clearRoute();
    });

    this.eventBus.on(EventType.CAMERA_RESET, () => {
      this.controlPanel?.updateButtonState('mode', false);
      this.syncControlModeButton(false);
    });

    this.eventBus.on(EventType.CAMERA_MODE_CHANGED, () => {
      this.syncControlModeButton(false);
      this.refreshFloorButtons();
    });
  }

  private setupCallbacks(): void {
    this.controlPanel?.addEventListener((event: any) => {
      void this.handleControlPanelEvent(event);
    });

    this.searchBar?.setResultClickCallback((result: SearchResult) => {
      if (result.id && this.markerManager) {
        const marker = this.markerManager.getMarker(result.id);
        if (marker) {
          this.controlPanel?.setButtonsEnabled(false);
          this.markerManager.focusOnMarker(marker.id, { distance: 8, duration: 1.0 });
          this.markerManager.setSelectedMarker(marker);
          this.markerDetailsPanel?.show(marker as any);
          setTimeout(() => this.controlPanel?.setButtonsEnabled(true), 1200);
        }
      }
    });

    this.markerDetailsPanel?.setRouteCallbacks(
      (marker: Marker) => this.handleFromMarkerToggle(marker),
      (marker: Marker) => this.handleToMarkerToggle(marker)
    );

    this.markerDetailsPanel?.setFocusCallback((marker: Marker) => {
      this.controlPanel?.setButtonsEnabled(false);
      this.markerManager?.focusOnMarker(marker.id, { distance: 8, duration: 1.2 });
      setTimeout(() => this.controlPanel?.setButtonsEnabled(true), 1400);
    });

    this.markerManager?.setOnMarkerSelected((marker: IMarker | null) => {
      if (marker) {
        const routeState = this.routeManager.getRouteState();
        this.markerDetailsPanel?.updateFromState(routeState.fromMarkerId === marker.id);
        this.markerDetailsPanel?.updateToState(routeState.toMarkerId === marker.id);
        this.markerDetailsPanel?.show(marker as any);
      } else {
        this.markerDetailsPanel?.hide();
      }
    });
  }

  // ✅ Обработка кнопки "Отсюда"
  private handleFromMarkerToggle(marker: Marker): void {
    this.routeManager.setFromMarker(marker.id);

    // Обновляем состояние панели
    const routeState = this.routeManager.getRouteState();
    this.markerDetailsPanel?.updateRouteState(
      routeState.fromMarkerId,
      routeState.toMarkerId
    );
  }

  private handleToMarkerToggle(marker: Marker): void {
    this.routeManager.setToMarker(marker.id);

    // Обновляем состояние панели
    const routeState = this.routeManager.getRouteState();
    this.markerDetailsPanel?.updateRouteState(
      routeState.fromMarkerId,
      routeState.toMarkerId
    );
  }

  private async handleControlPanelEvent(event: { type: UIEventType; floor?: number }): Promise<void> {
    switch (event.type) {
      case UIEventType.SEARCH_TOGGLE:
        this.searchBar?.toggle();
        break;
      case UIEventType.AUTH_TOGGLE:
        this.authPopup?.show();
        break;
      case UIEventType.CAMERA_MODE_TOGGLE:
        await this.cameraManager?.toggleCameraMode();
        break;
      case UIEventType.CAMERA_CONTROL_MODE_TOGGLE:
        await this.cameraManager?.toggleControlMode();
        this.syncControlModeButton();
        break;
      case UIEventType.RESET_CAMERA:
        this.controlPanel?.setButtonsEnabled(false);
        this.cameraManager?.resetCamera();
        setTimeout(() => this.controlPanel?.setButtonsEnabled(true), 1200);
        break;
      case UIEventType.TOGGLE_GRAPH:
        if (this.cameraManager?.isAnimating) {
          this.logger.debug('Camera animation in progress, ignoring graph toggle');
          return;
        }
        this.markerManager?.toggleGraph();
        break;
      case UIEventType.TOGGLE_THEME:
        this.toggleTheme();
        break;
      case UIEventType.TOGGLE_WALL_TRANSPARENCY:
        this.toggleWallTransparency();
        break;
      case UIEventType.TOGGLE_FLOOR_EXPAND:
        this.toggleFloorExpand();
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

  private async toggleFloorExpand(): Promise<void> {
    if (this.buildingManager) {
      // Блокируем кнопки перед анимацией
      this.controlPanel?.setButtonsEnabled(false);

      await this.buildingManager.floorManager.toggleFloorExpand();
      const isExpanded = this.buildingManager.floorManager.getFloorExpandState();
      const message = isExpanded ? 'Этажи раскрыты' : 'Этажи сжаты';
      this.showInfo(message);

      // Обновляем кнопку
      this.controlPanel?.updateButtonState('expand', isExpanded);

      // Разблокируем кнопки после анимации
      this.controlPanel?.setButtonsEnabled(true);
      this.refreshFloorButtons();
    } else {
      this.logger.warn('BuildingManager not available');
    }
  }

  private syncControlModeButton(showMessage: boolean = true): void {
    if (!this.cameraManager) return;

    const isFreeFlight = this.cameraManager.cameraMode === 'free_flight';
    this.controlPanel?.updateButtonState('control-mode', isFreeFlight);

    if (showMessage) {
      const modeText = isFreeFlight ? 'Free Flight' : 'Orbit';
      this.showInfo(`Режим управления: ${modeText}`);
    }
  }

  private toggleViewMode(): void {
    if (this.buildingManager) {
      const floorManager = this.buildingManager.floorManager;
      if (floorManager.isFloorAnimating?.()) {
        this.logger.debug('Floor animation in progress, ignoring');
        return;
      }

      floorManager.toggleViewMode();
      const mode = floorManager.getViewMode();
      const message = mode === 'single' ? 'Режим: отдельный этаж' : 'Режим: всё здание';
      this.showInfo(message);

      // ✅ При смене режима обновляем видимость маркеров
      const floor = mode === 'single'
        ? floorManager.currentFloor
        : 'all';
      this.markerManager?.setCurrentFloor(floor);
      this.refreshFloorButtons();
    } else {
      this.logger.warn('BuildingManager not available');
    }
  }

  private nextFloor(): void {
    if (this.buildingManager) {
      const floorManager = this.buildingManager.floorManager;
      if (floorManager.isFloorAnimating?.()) {
        this.logger.debug('Floor animation in progress, ignoring');
        return;
      }

      const currentMode = floorManager.getViewMode();
      const currentFloor = floorManager.currentFloor;
      const maxFloor = floorManager.maxFloor;

      if (currentMode === 'all') {
        this.temporarilyLockFloorButtons();
        floorManager.setViewMode('single');
        floorManager.showFloor(floorManager.minFloor);
      } else if (currentFloor < maxFloor) {
        this.temporarilyLockFloorButtons();
        floorManager.showFloor(currentFloor + 1);
      }

      this.refreshFloorButtons();
    }
  }

  private prevFloor(): void {
    if (this.buildingManager) {
      const floorManager = this.buildingManager.floorManager;
      if (floorManager.isFloorAnimating?.()) {
        this.logger.debug('Floor animation in progress, ignoring');
        return;
      }

      const currentMode = floorManager.getViewMode();
      const currentFloor = floorManager.currentFloor;
      const minFloor = floorManager.minFloor;

      if (currentMode === 'all') {
        this.temporarilyLockFloorButtons();
        floorManager.setViewMode('single');
        floorManager.showFloor(floorManager.maxFloor);
      } else if (currentFloor > minFloor) {
        this.temporarilyLockFloorButtons();
        floorManager.showFloor(currentFloor - 1);
      }

      this.refreshFloorButtons();
    }
  }

  private temporarilyLockFloorButtons(durationMs: number = 700): void {
    this.controlPanel?.setButtonsEnabled(false);

    if (this.floorButtonLockTimeout) {
      clearTimeout(this.floorButtonLockTimeout);
    }

    this.floorButtonLockTimeout = setTimeout(() => {
      this.controlPanel?.setButtonsEnabled(true);
      this.refreshFloorButtons();
      this.floorButtonLockTimeout = null;
    }, durationMs);
  }

  private refreshFloorButtons(): void {
    if (!this.buildingManager || !this.controlPanel) return;

    const floorManager = this.buildingManager.floorManager;
    const currentFloor = floorManager.getViewMode() === 'single' ? floorManager.currentFloor : 0;
    this.controlPanel.updateFloorButtons(currentFloor, floorManager.maxFloor);
  }

  private clearRoute(): void {
    this.routeManager.clearRoute();
  }

  private toggleTheme(): void {
    const newTheme = this._currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  // === Публичные методы ===

  public showLoading(status: string): void {
    this._isLoading = true;
    this.logger.debug(`[Loading] ${status}`);
  }

  public updateLoadingProgress(progress: number, status?: string): void {
    this.logger.debug(`[Loading] ${Math.round(progress * 100)}% - ${status}`);
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
    if (this.floorButtonLockTimeout) {
      clearTimeout(this.floorButtonLockTimeout);
      this.floorButtonLockTimeout = null;
    }
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
