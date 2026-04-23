import { Logger } from "@core/logger/logger";
import { UIEventType, CameraMode } from "@shared/types";
import { IBuildingManager, ICameraManager, IControlPanel, IMarkerManager, ISearchBar, IAuthPopup } from "@shared/interfaces";

export interface UIManagerControlFlowContext {
  cameraManager?: ICameraManager;
  buildingManager?: IBuildingManager;
  markerManager?: IMarkerManager;
  controlPanel?: IControlPanel;
  searchBar?: ISearchBar;
  authPopup?: IAuthPopup;
  currentUserAuthenticated: boolean;
  showInfo(message: string, duration?: number): void;
  refreshFloorButtons(): void;
  syncCameraModeButton(showMessage?: boolean): void;
  syncControlModeButton(showMessage?: boolean): void;
  scanQrCode(): Promise<void>;
  toggleTheme(): void;
  toggleMarkersVisibility(): void;
  toggleWallTransparency(): void;
}

export class UIManagerControlFlow {
  private floorButtonLockTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly logger: Logger) {}

  public async handleControlPanelEvent(
    context: UIManagerControlFlowContext,
    event: { type: UIEventType; floor?: number }
  ): Promise<void> {
    switch (event.type) {
      case UIEventType.SEARCH_TOGGLE:
        context.searchBar?.toggle();
        break;
      case UIEventType.QR_SCAN:
        await context.scanQrCode();
        break;
      case UIEventType.AUTH_TOGGLE:
        if (context.currentUserAuthenticated) {
          context.authPopup?.showLogoutConfirmation();
        } else {
          context.authPopup?.show();
        }
        break;
      case UIEventType.CAMERA_MODE_TOGGLE:
        await this.handleCameraTransition(context, async () => {
          await context.cameraManager?.toggleCameraMode();
        });
        break;
      case UIEventType.CAMERA_CONTROL_MODE_TOGGLE:
        await this.handleCameraTransition(context, async () => {
          await context.cameraManager?.toggleControlMode();
          context.syncControlModeButton();
        });
        break;
      case UIEventType.RESET_CAMERA:
        await this.handleCameraTransition(context, async () => {
          await context.cameraManager?.resetCamera();
        });
        break;
      case UIEventType.TOGGLE_GRAPH:
        if (context.cameraManager?.isAnimating) {
          this.logger.debug('Camera animation in progress, ignoring graph toggle');
          return;
        }
        context.markerManager?.toggleGraph();
        break;
      case UIEventType.TOGGLE_THEME:
        context.toggleTheme();
        break;
      case UIEventType.TOGGLE_MARKERS:
        context.toggleMarkersVisibility();
        break;
      case UIEventType.TOGGLE_WALL_TRANSPARENCY:
        context.toggleWallTransparency();
        break;
      case UIEventType.TOGGLE_FLOOR_EXPAND:
        await this.toggleFloorExpand(context);
        break;
      case UIEventType.TOGGLE_VIEW_MODE:
        this.toggleViewMode(context);
        break;
      case UIEventType.NEXT_FLOOR:
        this.nextFloor(context);
        break;
      case UIEventType.PREV_FLOOR:
        this.prevFloor(context);
        break;
      case UIEventType.FLOOR_SELECT:
        if (typeof event.floor === 'number') {
          this.selectFloor(context, event.floor);
        }
        break;
      default:
        this.logger.debug(`Unhandled UI event: ${event.type}`);
    }
  }

  public syncCameraModeButton(context: UIManagerControlFlowContext, showMessage: boolean = true): void {
    if (!context.cameraManager) return;

    const isTopDown = context.cameraManager.cameraMode === CameraMode.TOP_DOWN;
    context.controlPanel?.updateButtonState('mode', isTopDown);

    if (showMessage) {
      const modeText = isTopDown ? '2D' : '3D';
      context.showInfo(`Режим просмотра: ${modeText}`);
    }
  }

  public syncControlModeButton(context: UIManagerControlFlowContext, showMessage: boolean = true): void {
    if (!context.cameraManager) return;

    const isOrbit = context.cameraManager.cameraMode === CameraMode.ORBIT;
    context.controlPanel?.updateButtonState('control-mode', isOrbit);

    if (showMessage) {
      const modeText = isOrbit ? 'Orbit' : 'Free Flight';
      context.showInfo(`Режим управления: ${modeText}`);
    }
  }

  public refreshFloorButtons(context: UIManagerControlFlowContext): void {
    if (!context.buildingManager || !context.controlPanel) return;

    const floorManager = context.buildingManager.floorManager;
    const accessibleFloors = floorManager.getAccessibleFloorNumbers();
    const currentFloor = floorManager.getViewMode() === 'single' ? floorManager.currentFloor : 0;
    const maxAccessibleFloor = accessibleFloors[accessibleFloors.length - 1] ?? 0;
    context.controlPanel.updateButtonState('view', floorManager.getViewMode() === 'single');
    context.controlPanel.updateFloorButtons(currentFloor, maxAccessibleFloor, accessibleFloors);
  }

  public dispose(): void {
    if (this.floorButtonLockTimeout) {
      clearTimeout(this.floorButtonLockTimeout);
      this.floorButtonLockTimeout = null;
    }
  }

  private async handleCameraTransition(
    context: UIManagerControlFlowContext,
    action: () => Promise<void>
  ): Promise<void> {
    if (!context.cameraManager) return;
    if (context.cameraManager.isAnimating) return;

    this.setCameraButtonsDisabled(context.controlPanel, true);

    try {
      await action();
      await this.waitForCameraIdle(context.cameraManager);
    } finally {
      context.syncCameraModeButton(false);
      context.syncControlModeButton(false);
      context.refreshFloorButtons();
      this.setCameraButtonsDisabled(context.controlPanel, false);
    }
  }

  private setCameraButtonsDisabled(controlPanel: IControlPanel | undefined, disabled: boolean): void {
    controlPanel?.setButtonDisabled('mode', disabled);
    controlPanel?.setButtonDisabled('control-mode', disabled);
    controlPanel?.setButtonDisabled('reset', disabled);
  }

  private waitForCameraIdle(cameraManager: ICameraManager, timeoutMs: number = 4000): Promise<void> {
    const startedAt = Date.now();

    return new Promise((resolve) => {
      const poll = () => {
        if (!cameraManager.isAnimating || Date.now() - startedAt >= timeoutMs) {
          resolve();
          return;
        }

        setTimeout(poll, 50);
      };

      poll();
    });
  }

  private async toggleFloorExpand(context: UIManagerControlFlowContext): Promise<void> {
    if (!context.buildingManager) {
      this.logger.warn('BuildingManager not available');
      return;
    }

    context.controlPanel?.setButtonsEnabled(false);
    await context.buildingManager.floorManager.toggleFloorExpand();
    const isExpanded = context.buildingManager.floorManager.getFloorExpandState();
    context.showInfo(isExpanded ? 'Этажи раскрыты' : 'Этажи сжаты');
    context.controlPanel?.updateButtonState('expand', isExpanded);
    context.controlPanel?.setButtonsEnabled(true);
    context.refreshFloorButtons();
  }

  private toggleViewMode(context: UIManagerControlFlowContext): void {
    if (!context.buildingManager) {
      this.logger.warn('BuildingManager not available');
      return;
    }

    const floorManager = context.buildingManager.floorManager;
    if (floorManager.isFloorAnimating?.()) {
      this.logger.debug('Floor animation in progress, ignoring');
      return;
    }

    floorManager.toggleViewMode();
    const mode = floorManager.getViewMode();
    context.showInfo(mode === 'single' ? 'Режим: отдельный этаж' : 'Режим: всё здание');

    context.markerManager?.setCurrentFloor(mode === 'single' ? floorManager.currentFloor : 'all');
    context.refreshFloorButtons();
  }

  private nextFloor(context: UIManagerControlFlowContext): void {
    if (!context.buildingManager) return;

    const floorManager = context.buildingManager.floorManager;
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
        this.temporarilyLockFloorButtons(context.controlPanel, context.refreshFloorButtons);
        floorManager.setViewMode('single');
        floorManager.showFloor(firstAccessibleFloor);
      }
    } else {
      const nextFloor = accessibleFloors.find(floor => floor > currentFloor);
      if (nextFloor !== undefined) {
        this.temporarilyLockFloorButtons(context.controlPanel, context.refreshFloorButtons);
        floorManager.showFloor(nextFloor);
      }
    }

    context.refreshFloorButtons();
  }

  private prevFloor(context: UIManagerControlFlowContext): void {
    if (!context.buildingManager) return;

    const floorManager = context.buildingManager.floorManager;
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
        this.temporarilyLockFloorButtons(context.controlPanel, context.refreshFloorButtons);
        floorManager.setViewMode('single');
        floorManager.showFloor(lastAccessibleFloor);
      }
    } else {
      const previousFloors = accessibleFloors.filter(floor => floor < currentFloor);
      const prevFloor = previousFloors[previousFloors.length - 1];
      if (prevFloor !== undefined) {
        this.temporarilyLockFloorButtons(context.controlPanel, context.refreshFloorButtons);
        floorManager.showFloor(prevFloor);
      }
    }

    context.refreshFloorButtons();
  }

  private selectFloor(context: UIManagerControlFlowContext, floor: number): void {
    if (!context.buildingManager) return;

    const floorManager = context.buildingManager.floorManager;
    if (floorManager.isFloorAnimating?.()) {
      return;
    }

    if (!floorManager.getAccessibleFloorNumbers().includes(floor)) {
      return;
    }

    this.temporarilyLockFloorButtons(context.controlPanel, context.refreshFloorButtons);
    if (floorManager.getViewMode() === 'all') {
      floorManager.setViewMode('single');
    }
    floorManager.showFloor(floor);
    context.refreshFloorButtons();
  }

  private temporarilyLockFloorButtons(
    controlPanel: IControlPanel | undefined,
    refreshFloorButtons: () => void,
    durationMs: number = 700
  ): void {
    controlPanel?.setButtonsEnabled(false);

    if (this.floorButtonLockTimeout) {
      clearTimeout(this.floorButtonLockTimeout);
    }

    this.floorButtonLockTimeout = setTimeout(() => {
      controlPanel?.setButtonsEnabled(true);
      refreshFloorButtons();
      this.floorButtonLockTimeout = null;
    }, durationMs);
  }
}
