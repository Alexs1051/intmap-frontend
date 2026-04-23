import { injectable, inject } from "inversify";
import { Scene } from "@babylonjs/core";
import { BuildingApi } from "@core/api/building-api";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { UIFactory } from "./ui-factory";
import { UIManagerBuildingFlow, UIManagerBuildingFlowContext } from "./ui-manager-building-flow";
import { UIManagerControlFlow, UIManagerControlFlowContext } from "./ui-manager-control-flow";
import { UIManagerQrScanner } from "./ui-manager-qr-scanner";
import { UIManagerDeepLinkFlow, UIManagerDeepLinkFlowContext } from "./ui-manager-deep-link-flow";
import { UIManagerSessionFlow, UIManagerSessionFlowContext } from "./ui-manager-session-flow";
import { RouteManager } from "@core/route/route-manager";
import { UIEventType, NotificationType, SearchResult, AuthResult, UserInfo, UIEvent } from "@shared/types";
import { setCurrentBuildingRef } from "@shared/utils/url.utils";
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
  private currentUserInfo: UserInfo = { isAuthenticated: false, role: 'guest' };
  private markersVisible: boolean = true;
  private readonly buildingApi: BuildingApi = new BuildingApi();
  private readonly buildingFlow: UIManagerBuildingFlow;
  private readonly controlFlow: UIManagerControlFlow;
  private readonly qrScanner: UIManagerQrScanner;
  private readonly deepLinkFlow: UIManagerDeepLinkFlow;
  private readonly sessionFlow: UIManagerSessionFlow;
  private loadingHideTimeout: ReturnType<typeof setTimeout> | null = null;

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
    this.buildingFlow = new UIManagerBuildingFlow(this.buildingApi, this.logger);
    this.controlFlow = new UIManagerControlFlow(this.logger);
    this.qrScanner = new UIManagerQrScanner(this.logger, () => this.popupManager);
    this.deepLinkFlow = new UIManagerDeepLinkFlow(this.logger);
    this.sessionFlow = new UIManagerSessionFlow();
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
    void this.initializeBuildingCatalog();

    if (this.markerManager) {
      this.logger.debug('MarkerManager set in UIManager');

      if (this.searchBar) {
        this.logger.debug('Setting MarkerManager to SearchBar');
        this.searchBar.setMarkerManager(this.markerManager);
      }

      this.eventBus.on(EventType.MARKERS_LOADED, () => {
        this.logger.debug('MARKERS_LOADED event received');
        this.searchBar?.refreshMarkers();
        void this.processPendingDeepLink();
      });
    }

    this.setupCallbacks();
    this.setupEventBusListeners();
    this.loadTheme();
    this.restoreStoredAuthSession();
    this.controlPanel?.setAuthState(this.currentUserInfo);
    this.markerManager?.setUserInfo(this.currentUserInfo);
    this.buildingManager?.setUserInfo(this.currentUserInfo);
    this.syncCurrentBuildingContext();
    this.capturePendingDeepLink();
    this.syncCameraModeButton(false);
    this.syncControlModeButton(false);
    this.controlPanel?.setMarkersVisible(this.markersVisible);
    this.refreshFloorButtons();
    void this.processPendingDeepLink();

    this.eventBus.on(EventType.LOADING_ERROR, (event) => {
      const errorData = event.data as { error?: Error | string; message?: string } | undefined;
      const errorMessage = errorData?.error instanceof Error
        ? errorData.error.message
        : errorData?.error || errorData?.message || "Неизвестная ошибка";
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

    this.organizeStatusStack();
    this.logger.debug('All UI components created');

    setTimeout(() => {
      const controlPanelEl = document.querySelector('.control-panel');
      const searchOverlay = document.querySelector('.search-overlay');
      this.logger.debug('ControlPanel in DOM:', !!controlPanelEl);
      this.logger.debug('SearchBar in DOM:', !!searchOverlay);
    }, 100);
  }

  private organizeStatusStack(): void {
    let statusStack = document.querySelector('.ui-status-stack') as HTMLDivElement | null;

    if (!statusStack) {
      statusStack = document.createElement('div');
      statusStack.className = 'ui-status-stack';
      document.body.appendChild(statusStack);
    }

    const statusElements = [
      document.querySelector('.control-panel-access'),
      document.getElementById('fps-counter')
    ].filter((element): element is HTMLElement => element instanceof HTMLElement);

    const debug = document.getElementById('debug');
    if (debug) {
      debug.style.display = 'none';
    }

    statusElements.forEach((element) => {
      element.classList.add('ui-status-pill');
      statusStack?.appendChild(element);
    });
  }

  private async initializeBuildingCatalog(): Promise<void> {
    await this.buildingFlow.initializeBuildingCatalog(this.getBuildingFlowContext(), this.deepLinkFlow.getPendingBuildingId());
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
      if (typeof expanded === 'boolean') {
        this.controlPanel?.updateButtonState('expand', expanded);
      }
    });

    this.eventBus.on(EventType.GRAPH_VISIBILITY_CHANGED, (event) => {
      this.logger.debug(`Graph visibility changed to ${event.data?.visible}`);
      if (typeof event.data?.visible === 'boolean') {
        this.controlPanel?.setGraphVisible(event.data.visible);
      }
    });

    this.eventBus.on(EventType.UI_NOTIFICATION, (event) => {
      const message = event.data?.message;
      const type = event.data?.type as NotificationType | undefined;
      const duration = event.data?.duration as number | undefined;

      if (message) {
        this.popupManager?.show({ message, type, duration });
      }
    });

    this.eventBus.on(EventType.ROUTE_CLEARED, () => {
      this.clearRoute();
    });

    this.eventBus.on(EventType.CAMERA_RESET, () => {
      this.syncCameraModeButton(false);
      this.syncControlModeButton(false);
    });

    this.eventBus.on(EventType.CAMERA_MODE_CHANGED, () => {
      this.syncCameraModeButton(false);
      this.syncControlModeButton(false);
      this.refreshFloorButtons();
    });
  }

  private setupCallbacks(): void {
    this.controlPanel?.addEventListener((event: UIEvent) => {
      void this.handleControlPanelEvent(event);
    });

    this.searchBar?.setResultClickCallback((result: SearchResult) => {
      if (result.id && this.markerManager) {
        const marker = this.markerManager.getMarker(result.id);
        if (marker) {
          this.controlPanel?.setButtonsEnabled(false);
          this.markerManager.focusOnMarker(marker.id, { distance: 8, duration: 1.0 });
          this.markerManager.setSelectedMarker(marker);
          this.markerDetailsPanel?.show(marker);
          setTimeout(() => this.controlPanel?.setButtonsEnabled(true), 1200);
        }
      }
    });

    this.markerDetailsPanel?.setRouteCallbacks(
      (marker: IMarker) => this.handleFromMarkerToggle(marker),
      (marker: IMarker) => this.handleToMarkerToggle(marker)
    );

    this.markerDetailsPanel?.setFocusCallback((marker: IMarker) => {
      this.controlPanel?.setButtonsEnabled(false);
      this.markerManager?.focusOnMarker(marker.id, { distance: 8, duration: 1.2 });
      setTimeout(() => this.controlPanel?.setButtonsEnabled(true), 1400);
    });

    this.markerManager?.setOnMarkerSelected((marker: IMarker | null) => {
      if (marker) {
        const routeState = this.routeManager.getRouteState();
        this.markerDetailsPanel?.updateFromState(routeState.fromMarkerId === marker.id);
        this.markerDetailsPanel?.updateToState(routeState.toMarkerId === marker.id);
        this.markerDetailsPanel?.show(marker);
      } else {
        this.markerDetailsPanel?.hide();
      }
    });

    this.authPopup?.setAuthCallback((result: AuthResult) => {
      void this.handleAuthResult(result);
    });

    this.buildingTitle?.setOnBuildingChange((buildingId: string) => {
      void this.handleBuildingChange(buildingId);
    });
  }

  // ✅ Обработка кнопки "Отсюда"
  private handleFromMarkerToggle(marker: IMarker): void {
    this.routeManager.setFromMarker(marker.id);

    // Обновляем состояние панели
    const routeState = this.routeManager.getRouteState();
    this.markerDetailsPanel?.updateRouteState(
      routeState.fromMarkerId,
      routeState.toMarkerId
    );
  }

  private handleToMarkerToggle(marker: IMarker): void {
    this.routeManager.setToMarker(marker.id);

    // Обновляем состояние панели
    const routeState = this.routeManager.getRouteState();
    this.markerDetailsPanel?.updateRouteState(
      routeState.fromMarkerId,
      routeState.toMarkerId
    );
  }

  private async handleControlPanelEvent(event: { type: UIEventType; floor?: number }): Promise<void> {
    await this.controlFlow.handleControlPanelEvent(this.getControlFlowContext(), event);
  }

  private getControlFlowContext(): UIManagerControlFlowContext {
    return {
      cameraManager: this.cameraManager,
      buildingManager: this.buildingManager,
      markerManager: this.markerManager,
      controlPanel: this.controlPanel,
      searchBar: this.searchBar,
      authPopup: this.authPopup,
      currentUserAuthenticated: this.currentUserInfo.isAuthenticated,
      showInfo: (message, duration) => this.showInfo(message, duration),
      refreshFloorButtons: () => this.refreshFloorButtons(),
      syncCameraModeButton: (showMessage?: boolean) => this.syncCameraModeButton(showMessage),
      syncControlModeButton: (showMessage?: boolean) => this.syncControlModeButton(showMessage),
      scanQrCode: () => this.scanQrCode(),
      toggleTheme: () => this.toggleTheme(),
      toggleMarkersVisibility: () => this.toggleMarkersVisibility(),
      toggleWallTransparency: () => this.toggleWallTransparency()
    };
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

  private syncCameraModeButton(showMessage: boolean = true): void {
    this.controlFlow.syncCameraModeButton(this.getControlFlowContext(), showMessage);
  }

  private syncControlModeButton(showMessage: boolean = true): void {
    this.controlFlow.syncControlModeButton(this.getControlFlowContext(), showMessage);
  }

  private async handleBuildingChange(_buildingId: string): Promise<void> {
    await this.reloadSelectedBuilding(true);
  }

  private refreshFloorButtons(): void {
    this.controlFlow.refreshFloorButtons(this.getControlFlowContext());
  }

  private toggleMarkersVisibility(): void {
    this.markersVisible = !this.markersVisible;
    this.markerManager?.setMarkersMuted(!this.markersVisible);
    this.controlPanel?.setMarkersVisible(this.markersVisible);
  }

  private async scanQrCode(): Promise<void> {
    await this.qrScanner.scanQrCode(this.markerManager, this.markerDetailsPanel);
  }

  private clearRoute(): void {
    this.routeManager.clearRoute();
  }

  private getBuildingFlowContext(): UIManagerBuildingFlowContext {
    return {
      buildingTitle: this.buildingTitle,
      buildingManager: this.buildingManager,
      markerManager: this.markerManager,
      cameraManager: this.cameraManager,
      controlPanel: this.controlPanel,
      markerDetailsPanel: this.markerDetailsPanel,
      searchBar: this.searchBar,
      popupManager: this.popupManager,
      routeManager: this.routeManager,
      showLoading: (status, progress) => this.showLoading(status, progress),
      updateLoadingProgress: (progress, status) => this.updateLoadingProgress(progress, status),
      hideLoading: () => this.hideLoading(),
      refreshFloorButtons: () => this.refreshFloorButtons(),
      syncCurrentBuildingContext: () => this.syncCurrentBuildingContext(),
      syncControlModeButton: (showMessage?: boolean) => this.syncControlModeButton(showMessage),
      processPendingDeepLink: () => this.processPendingDeepLink(),
      waitForNextFrame: () => this.waitForNextFrame()
    };
  }

  private getDeepLinkFlowContext(): UIManagerDeepLinkFlowContext {
    return {
      buildingTitle: this.buildingTitle,
      markerManager: this.markerManager,
      markerDetailsPanel: this.markerDetailsPanel,
      popupManager: this.popupManager,
      handleBuildingChange: (buildingId: string) => this.handleBuildingChange(buildingId)
    };
  }

  private getSessionFlowContext(): UIManagerSessionFlowContext {
    return {
      controlPanel: this.controlPanel,
      markerManager: this.markerManager,
      buildingManager: this.buildingManager,
      searchBar: this.searchBar,
      markerDetailsPanel: this.markerDetailsPanel,
      popupManager: this.popupManager,
      routeManager: this.routeManager,
      eventBus: this.eventBus,
      refreshSceneAccessState: () => this.refreshSceneAccessState()
    };
  }

  private syncCurrentBuildingContext(): void {
    const currentBuildingId = this.buildingTitle?.selectedBuilding?.id;
    if (currentBuildingId) {
      setCurrentBuildingRef(currentBuildingId);
    }
    this.routeManager.setCurrentBuilding(this.buildingTitle?.selectedBuilding ?? null);
    this.markerManager?.setCurrentBuilding(this.buildingTitle?.selectedBuilding ?? null);
  }

  private capturePendingDeepLink(): void {
    this.deepLinkFlow.capturePendingDeepLink();
  }

  private async processPendingDeepLink(): Promise<void> {
    await this.deepLinkFlow.processPendingDeepLink(this.getDeepLinkFlowContext());
  }

  private async handleAuthResult(result: AuthResult): Promise<void> {
    this.currentUserInfo = await this.sessionFlow.handleAuthResult(result, this.getSessionFlowContext());
  }

  private restoreStoredAuthSession(): void {
    this.currentUserInfo = this.sessionFlow.restoreStoredAuthSession();
  }

  private async refreshSceneAccessState(): Promise<void> {
    await this.buildingFlow.refreshSceneAccessState(this.getBuildingFlowContext());
  }

  private async reloadSelectedBuilding(showToast: boolean, manageLoading: boolean = true): Promise<void> {
    await this.buildingFlow.reloadSelectedBuilding(this.getBuildingFlowContext(), showToast, manageLoading);
  }

  private toggleTheme(): void {
    const newTheme = this._currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  // === Публичные методы ===

  public showLoading(status: string, progress: number = 0): void {
    this._isLoading = true;
    const loadingEl = document.getElementById('app-loading');
    const statusEl = document.getElementById('loading-status');
    const barEl = document.getElementById('loading-bar');
    const percentEl = document.getElementById('loading-percent');

    if (this.loadingHideTimeout) {
      clearTimeout(this.loadingHideTimeout);
      this.loadingHideTimeout = null;
    }

    if (loadingEl) {
      loadingEl.classList.toggle('theme-light', this._currentTheme === 'light');
      loadingEl.style.display = 'flex';
      loadingEl.classList.remove('hidden');
    }

    if (statusEl) {
      statusEl.textContent = status;
    }

    if (barEl) {
      barEl.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
    }

    if (percentEl) {
      percentEl.textContent = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
    }

    this.logger.debug(`[Loading] ${status}`);
  }

  public updateLoadingProgress(progress: number, status?: string): void {
    const normalizedProgress = Math.max(0, Math.min(1, progress));
    const barEl = document.getElementById('loading-bar');
    const percentEl = document.getElementById('loading-percent');
    const statusEl = document.getElementById('loading-status');

    if (barEl) {
      barEl.style.width = `${Math.round(normalizedProgress * 100)}%`;
    }

    if (percentEl) {
      percentEl.textContent = `${Math.round(normalizedProgress * 100)}%`;
    }

    if (status && statusEl) {
      statusEl.textContent = status;
    }

    this.logger.debug(`[Loading] ${Math.round(progress * 100)}% - ${status}`);
  }

  public hideLoading(): void {
    this._isLoading = false;
    const loadingEl = document.getElementById('app-loading');
    if (!loadingEl) {
      return;
    }

    loadingEl.classList.add('hidden');
    this.loadingHideTimeout = setTimeout(() => {
      if (loadingEl.classList.contains('hidden')) {
        loadingEl.style.display = 'none';
      }
      this.loadingHideTimeout = null;
    }, 420);
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

  public setControlsEnabled(enabled: boolean): void {
    this.controlPanel?.setButtonsEnabled(enabled);
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
    const loadingEl = document.getElementById('app-loading');

    if (theme === 'light') {
      root.classList.add('theme-light');
      loadingEl?.classList.add('theme-light');
      this.controlPanel?.setDarkTheme(false);
    } else {
      root.classList.remove('theme-light');
      loadingEl?.classList.remove('theme-light');
      this.controlPanel?.setDarkTheme(true);
    }

    localStorage.setItem('theme', theme);
  }

  public loadTheme(): void {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    this.setTheme(savedTheme || 'dark');
  }

  private waitForNextFrame(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  public dispose(): void {
    this.qrScanner.dispose();
    this.controlFlow.dispose();
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

