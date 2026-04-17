import { injectable, inject } from "inversify";
import { Scene } from "@babylonjs/core";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { UIFactory } from "./ui-factory";
import { RouteManager } from "@core/route/route-manager";
import { UIEventType, NotificationType, SearchResult, AuthResult, UserInfo, MarkerType, CameraMode } from "@shared/types";
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
  private currentUserInfo: UserInfo = { isAuthenticated: false, role: 'guest' };
  private markersVisible: boolean = true;
  private qrScannerOverlay: HTMLDivElement | null = null;
  private qrScannerVideo: HTMLVideoElement | null = null;
  private qrScannerStatus: HTMLDivElement | null = null;
  private qrScannerStream: MediaStream | null = null;
  private qrScannerFrameHandle: number | null = null;
  private qrScannerResolve: ((value: string | null) => void) | null = null;

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
    this.controlPanel?.setAuthState(this.currentUserInfo);
    this.markerManager?.setUserInfo(this.currentUserInfo);
    this.buildingManager?.setUserInfo(this.currentUserInfo);
    this.syncControlModeButton(false);
    this.controlPanel?.setMarkersVisible(this.markersVisible);
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

    this.authPopup?.setAuthCallback((result: AuthResult) => {
      this.handleAuthResult(result);
    });

    this.buildingTitle?.setOnBuildingChange((buildingId: string) => {
      void this.handleBuildingChange(buildingId);
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
      case UIEventType.QR_SCAN:
        await this.scanQrCode();
        break;
      case UIEventType.AUTH_TOGGLE:
        if (this.currentUserInfo.isAuthenticated) {
          this.authPopup?.showLogoutConfirmation();
        } else {
          this.authPopup?.show();
        }
        break;
      case UIEventType.CAMERA_MODE_TOGGLE:
        await this.handleCameraTransition(async () => {
          await this.cameraManager?.toggleCameraMode();
        });
        break;
      case UIEventType.CAMERA_CONTROL_MODE_TOGGLE:
        await this.handleCameraTransition(async () => {
          await this.cameraManager?.toggleControlMode();
          this.syncControlModeButton();
        });
        break;
      case UIEventType.RESET_CAMERA:
        await this.handleCameraTransition(async () => {
          await this.cameraManager?.resetCamera();
        });
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
      case UIEventType.TOGGLE_MARKERS:
        this.toggleMarkersVisibility();
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
      case UIEventType.FLOOR_SELECT:
        if (typeof event.floor === 'number') {
          this.selectFloor(event.floor);
        }
        break;
      default:
        this.logger.debug(`Unhandled UI event: ${event.type}`);
    }
  }

  private async handleCameraTransition(action: () => Promise<void>): Promise<void> {
    if (!this.cameraManager) return;
    if (this.cameraManager.isAnimating) return;

    this.setCameraButtonsDisabled(true);

    try {
      await action();
      await this.waitForCameraIdle();
    } finally {
      this.syncControlModeButton(false);
      this.refreshFloorButtons();
      this.setCameraButtonsDisabled(false);
    }
  }

  private setCameraButtonsDisabled(disabled: boolean): void {
    this.controlPanel?.setButtonDisabled('mode', disabled);
    this.controlPanel?.setButtonDisabled('control-mode', disabled);
    this.controlPanel?.setButtonDisabled('reset', disabled);
  }

  private waitForCameraIdle(timeoutMs: number = 4000): Promise<void> {
    const startedAt = Date.now();

    return new Promise((resolve) => {
      const poll = () => {
        if (!this.cameraManager?.isAnimating || Date.now() - startedAt >= timeoutMs) {
          resolve();
          return;
        }

        setTimeout(poll, 50);
      };

      poll();
    });
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

    const isOrbit = this.cameraManager.cameraMode === CameraMode.ORBIT;
    this.controlPanel?.updateButtonState('control-mode', isOrbit);

    if (showMessage) {
      const modeText = isOrbit ? 'Orbit' : 'Free Flight';
      this.showInfo(`Режим управления: ${modeText}`);
    }
  }

  private async handleBuildingChange(_buildingId: string): Promise<void> {
    if (!this.buildingTitle?.selectedBuilding?.modelUrl || !this.buildingManager || !this.markerManager || !this.cameraManager) {
      return;
    }

    const selectedBuilding = this.buildingTitle.selectedBuilding;
    if (!selectedBuilding?.modelUrl) {
      return;
    }

    this.controlPanel?.setButtonsEnabled(false);
    this.markerDetailsPanel?.hide();
    this.routeManager.resetRoute();

    try {
      await this.buildingManager.reloadBuilding(selectedBuilding.modelUrl);
      await this.markerManager.initialize();

      this.cameraManager.setDimensions(this.buildingManager.dimensions);
      this.cameraManager.setTargetPosition(this.buildingManager.center);
      await this.cameraManager.switchToMode(CameraMode.FREE_FLIGHT);
      await this.cameraManager.initialize();

      const floorManager = this.buildingManager.floorManager;
      this.markerManager.setCurrentFloor(
        floorManager.getViewMode() === 'single' ? floorManager.currentFloor : 'all'
      );

      this.searchBar?.refreshMarkers();
      this.refreshFloorButtons();
      this.syncControlModeButton(false);
      this.popupManager?.success(`Загружено: ${selectedBuilding.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to switch building', error);
      this.popupManager?.error(`Не удалось загрузить ${selectedBuilding.name}: ${message}`);
    } finally {
      this.controlPanel?.setButtonsEnabled(true);
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
      const accessibleFloors = floorManager.getAccessibleFloorNumbers();
      const currentFloor = floorManager.currentFloor;

      if (currentMode === 'all') {
        const firstAccessibleFloor = accessibleFloors[0];
        if (firstAccessibleFloor !== undefined) {
          this.temporarilyLockFloorButtons();
          floorManager.setViewMode('single');
          floorManager.showFloor(firstAccessibleFloor);
        }
      } else {
        const nextFloor = accessibleFloors.find(floor => floor > currentFloor);
        if (nextFloor !== undefined) {
          this.temporarilyLockFloorButtons();
          floorManager.showFloor(nextFloor);
        }
      }

      this.refreshFloorButtons();
    }
  }

  private selectFloor(floor: number): void {
    if (!this.buildingManager) return;

    const floorManager = this.buildingManager.floorManager;
    if (floorManager.isFloorAnimating?.()) {
      return;
    }

    if (!floorManager.getAccessibleFloorNumbers().includes(floor)) {
      return;
    }

    this.temporarilyLockFloorButtons();
    if (floorManager.getViewMode() === 'all') {
      floorManager.setViewMode('single');
    }
    floorManager.showFloor(floor);
    this.refreshFloorButtons();
  }

  private prevFloor(): void {
    if (this.buildingManager) {
      const floorManager = this.buildingManager.floorManager;
      if (floorManager.isFloorAnimating?.()) {
        this.logger.debug('Floor animation in progress, ignoring');
        return;
      }

      const currentMode = floorManager.getViewMode();
      const accessibleFloors = floorManager.getAccessibleFloorNumbers();
      const currentFloor = floorManager.currentFloor;

      if (currentMode === 'all') {
        const lastAccessibleFloor = accessibleFloors[accessibleFloors.length - 1];
        if (lastAccessibleFloor !== undefined) {
          this.temporarilyLockFloorButtons();
          floorManager.setViewMode('single');
          floorManager.showFloor(lastAccessibleFloor);
        }
      } else {
        const previousFloors = accessibleFloors.filter(floor => floor < currentFloor);
        const prevFloor = previousFloors[previousFloors.length - 1];
        if (prevFloor !== undefined) {
          this.temporarilyLockFloorButtons();
          floorManager.showFloor(prevFloor);
        }
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
    const accessibleFloors = floorManager.getAccessibleFloorNumbers();
    const currentFloor = floorManager.getViewMode() === 'single' ? floorManager.currentFloor : 0;
    const maxAccessibleFloor = accessibleFloors[accessibleFloors.length - 1] ?? 0;
    this.controlPanel.updateButtonState('view', floorManager.getViewMode() === 'single');
    this.controlPanel.updateFloorButtons(currentFloor, maxAccessibleFloor, accessibleFloors);
  }

  private toggleMarkersVisibility(): void {
    this.markersVisible = !this.markersVisible;
    this.markerManager?.setMarkersMuted(!this.markersVisible);
    this.controlPanel?.setMarkersVisible(this.markersVisible);
  }

  private async scanQrCode(): Promise<void> {
    if (!this.markerManager) {
      return;
    }

    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      this.popupManager?.warning('Сканирование QR-кодов пока не поддерживается в этом браузере.');
      return;
    }

    const scannedText = await this.openLiveQrScanner();
    if (!scannedText) {
      return;
    }

    const normalized = scannedText.trim();
    const marker = this.markerManager.getAllMarkers().find((item) => {
      if (!item.hasQR()) return false;
      const markerQr = item.getQR();
      return typeof markerQr === 'string' && markerQr.trim() === normalized;
    });

    if (!marker) {
      this.popupManager?.warning('QR-код считан, но подходящая метка не найдена.');
      return;
    }

    this.markerManager.setSelectedMarker(marker);
    this.markerDetailsPanel?.show(marker as any);
    await this.markerManager.focusOnMarker(marker.id, { distance: 8, duration: 1.2 });
    this.popupManager?.success(`Найдена метка: ${marker.name}`);
  }

  private ensureQrScannerOverlay(): void {
    if (this.qrScannerOverlay && this.qrScannerVideo && this.qrScannerStatus) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'qr-scanner-overlay ui-modal-overlay';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.closeQrScanner(null);
      }
    });

    const surface = document.createElement('div');
    surface.className = 'qr-scanner-surface ui-modal-surface';

    const header = document.createElement('div');
    header.className = 'qr-scanner-header';

    const title = document.createElement('div');
    title.className = 'qr-scanner-title';
    title.textContent = 'Сканирование QR-кода';

    const closeButton = document.createElement('button');
    closeButton.className = 'qr-scanner-close';
    closeButton.type = 'button';
    closeButton.textContent = '✕';
    closeButton.addEventListener('click', () => this.closeQrScanner(null));

    header.appendChild(title);
    header.appendChild(closeButton);

    const viewport = document.createElement('div');
    viewport.className = 'qr-scanner-viewport';

    const video = document.createElement('video');
    video.className = 'qr-scanner-video';
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');

    const frame = document.createElement('div');
    frame.className = 'qr-scanner-frame';

    const status = document.createElement('div');
    status.className = 'qr-scanner-status';
    status.textContent = 'Наведите камеру на QR-код';

    viewport.appendChild(video);
    viewport.appendChild(frame);
    surface.appendChild(header);
    surface.appendChild(viewport);
    surface.appendChild(status);
    overlay.appendChild(surface);
    document.body.appendChild(overlay);

    this.qrScannerOverlay = overlay;
    this.qrScannerVideo = video;
    this.qrScannerStatus = status;
  }

  private async openLiveQrScanner(): Promise<string | null> {
    if (!(navigator.mediaDevices?.getUserMedia)) {
      return this.captureQrFromCameraFallback();
    }

    if (this.qrScannerResolve) {
      return null;
    }

    this.ensureQrScannerOverlay();

    return new Promise(async (resolve) => {
      this.qrScannerResolve = resolve;

      if (!this.qrScannerOverlay || !this.qrScannerVideo || !this.qrScannerStatus) {
        this.qrScannerResolve = null;
        resolve(null);
        return;
      }

      this.qrScannerStatus.textContent = 'Наведите камеру на QR-код';
      this.qrScannerOverlay.classList.add('visible');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        this.qrScannerStream = stream;
        this.qrScannerVideo.srcObject = stream;
        await this.qrScannerVideo.play();
        this.startQrDetectionLoop();
      } catch (error) {
        this.logger.error('Unable to open QR scanner camera', error);
        this.popupManager?.error('Не удалось открыть камеру для сканирования QR-кода.');
        this.closeQrScanner(null);
      }
    });
  }

  private startQrDetectionLoop(): void {
    if (!this.qrScannerVideo || !this.qrScannerStatus) {
      return;
    }

    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      this.popupManager?.warning('Сканирование QR-кодов пока не поддерживается в этом браузере.');
      this.closeQrScanner(null);
      return;
    }

    const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
    let isDetecting = false;

    const detectFrame = async () => {
      if (!this.qrScannerVideo || !this.qrScannerResolve) {
        return;
      }

      if (!isDetecting && this.qrScannerVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        isDetecting = true;
        try {
          const barcodes = await detector.detect(this.qrScannerVideo);
          const rawValue = barcodes?.[0]?.rawValue;
          if (typeof rawValue === 'string' && rawValue.trim()) {
            if (this.qrScannerStatus) {
              this.qrScannerStatus.textContent = 'QR-код распознан';
            }
            this.closeQrScanner(rawValue.trim());
            return;
          }
        } catch (error) {
          this.logger.error('QR detector loop error', error);
          this.popupManager?.error('Ошибка распознавания QR-кода.');
          this.closeQrScanner(null);
          return;
        } finally {
          isDetecting = false;
        }
      }

      this.qrScannerFrameHandle = requestAnimationFrame(() => {
        void detectFrame();
      });
    };

    void detectFrame();
  }

  private closeQrScanner(result: string | null): void {
    if (this.qrScannerFrameHandle !== null) {
      cancelAnimationFrame(this.qrScannerFrameHandle);
      this.qrScannerFrameHandle = null;
    }

    if (this.qrScannerVideo) {
      this.qrScannerVideo.pause();
      this.qrScannerVideo.srcObject = null;
    }

    if (this.qrScannerStream) {
      this.qrScannerStream.getTracks().forEach((track) => track.stop());
      this.qrScannerStream = null;
    }

    if (this.qrScannerOverlay) {
      this.qrScannerOverlay.classList.remove('visible');
    }

    const resolve = this.qrScannerResolve;
    this.qrScannerResolve = null;
    resolve?.(result);
  }

  private captureQrFromCameraFallback(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';

      const cleanup = () => {
        input.remove();
      };

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) {
          cleanup();
          resolve(null);
          return;
        }

        try {
          const imageBitmap = await createImageBitmap(file);
          const BarcodeDetectorCtor = (window as any).BarcodeDetector;
          const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
          const barcodes = await detector.detect(imageBitmap);
          imageBitmap.close?.();

          const rawValue = barcodes?.[0]?.rawValue;
          if (typeof rawValue === 'string' && rawValue.trim()) {
            resolve(rawValue);
          } else {
            this.popupManager?.warning('QR-код не распознан. Попробуйте ещё раз.');
            resolve(null);
          }
        } catch (error) {
          this.logger.error('QR scan failed', error);
          this.popupManager?.error('Не удалось обработать изображение с камеры.');
          resolve(null);
        } finally {
          cleanup();
        }
      }, { once: true });

      document.body.appendChild(input);
      input.click();
    });
  }

  private clearRoute(): void {
    this.routeManager.clearRoute();
  }

  private handleAuthResult(result: AuthResult): void {
    this.currentUserInfo = result.success
      ? {
        isAuthenticated: true,
        username: result.username,
        role: (result.role as UserInfo['role']) ?? 'user'
      }
      : {
        isAuthenticated: false,
        role: 'guest'
      };

    this.controlPanel?.setAuthState(this.currentUserInfo);
    this.markerManager?.setUserInfo(this.currentUserInfo);
    this.buildingManager?.setUserInfo(this.currentUserInfo);
    this.searchBar?.refreshMarkers();

    const currentMarker = this.markerDetailsPanel?.currentMarker;
    if (currentMarker && currentMarker.type === MarkerType.GATEWAY) {
      this.markerDetailsPanel?.show(currentMarker as Marker);
    }

    if (result.success) {
      this.popupManager?.success(`Авторизация выполнена: ${result.username}`);
      this.eventBus.emit(EventType.UI_AUTH_SUCCESS, this.currentUserInfo);
    } else {
      this.popupManager?.info('Вы вышли из системы');
      this.eventBus.emit(EventType.UI_AUTH_LOGOUT, this.currentUserInfo);
    }
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
    this.closeQrScanner(null);
    this.qrScannerOverlay?.remove();
    this.qrScannerOverlay = null;
    this.qrScannerVideo = null;
    this.qrScannerStatus = null;
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

