import { injectable } from "inversify";
import { Logger } from "../../core/logger/Logger";
import { CameraMode } from "../../shared/types";
import { ICameraInputHandler, ICameraManager } from "@shared/interfaces";

interface PointerState {
  isRightPressed: boolean;   // ПКМ - вращение
  isMiddlePressed: boolean;  // СКМ - панорамирование
  lastX: number;
  lastY: number;
}

@injectable()
export class CameraInputHandler implements ICameraInputHandler {
  private readonly logger = Logger.getInstance().getLogger('CameraInputHandler');
  private canvas: HTMLCanvasElement | null = null;
  private currentMode: CameraMode = CameraMode.ORBIT;

  private readonly ROTATION_SENSITIVITY = 1.0;
  private readonly PAN_SENSITIVITY = 1.0;

  private pointerState: PointerState = {
    isRightPressed: false,
    isMiddlePressed: false,
    lastX: 0,
    lastY: 0
  };

  private onOrbitRotate?: (dx: number, dy: number) => void;
  private onOrbitPan?: (dx: number, dy: number) => void;
  private onOrbitZoom?: (delta: number) => void;

  constructor() {
    this.logger.info('CameraInputHandler initialized');
  }

  public setCameraManager(_cameraManager: ICameraManager): void {
  }

  public attachToCanvas(canvas: HTMLCanvasElement): void {
    if (this.canvas) {
      this.removeCanvasListeners();
    }

    this.canvas = canvas;

    // Устанавливаем стили для canvas
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.logger.info('CameraInputHandler attached to canvas');
  }

  private removeCanvasListeners(): void {
    if (!this.canvas) return;

    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private onPointerDown(e: PointerEvent): void {
    console.log('Pointer down:', e.button);

    if (e.button === 2) { // ПКМ - вращение
      this.pointerState.isRightPressed = true;
      this.pointerState.lastX = e.clientX;
      this.pointerState.lastY = e.clientY;
      e.preventDefault();
      e.stopPropagation();
      this.canvas?.setPointerCapture(e.pointerId);
      if (this.canvas) this.canvas.style.cursor = 'grabbing';
      console.log('RKM pressed - rotation mode');
    } else if (e.button === 1) { // СКМ - панорамирование
      this.pointerState.isMiddlePressed = true;
      this.pointerState.lastX = e.clientX;
      this.pointerState.lastY = e.clientY;
      e.preventDefault();
      e.stopPropagation();
      this.canvas?.setPointerCapture(e.pointerId);
      if (this.canvas) this.canvas.style.cursor = 'move';
      console.log('MMB pressed - pan mode');
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.pointerState.isRightPressed) {
      const deltaX = (e.clientX - this.pointerState.lastX) * this.ROTATION_SENSITIVITY;
      const deltaY = (e.clientY - this.pointerState.lastY) * this.ROTATION_SENSITIVITY;

      if ((deltaX !== 0 || deltaY !== 0) && this.onOrbitRotate) {
        this.onOrbitRotate(-deltaX, -deltaY);
        this.pointerState.lastX = e.clientX;
        this.pointerState.lastY = e.clientY;
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (this.pointerState.isMiddlePressed) {
      const deltaX = (e.clientX - this.pointerState.lastX) * this.PAN_SENSITIVITY;
      const deltaY = (e.clientY - this.pointerState.lastY) * this.PAN_SENSITIVITY;

      if ((deltaX !== 0 || deltaY !== 0) && this.onOrbitPan) {
        this.onOrbitPan(deltaX, deltaY);
        this.pointerState.lastX = e.clientX;
        this.pointerState.lastY = e.clientY;
      }
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.button === 2) {
      this.pointerState.isRightPressed = false;
      if (this.canvas) this.canvas.style.cursor = 'default';
      this.canvas?.releasePointerCapture(e.pointerId);
      console.log('RKM released');
    } else if (e.button === 1) {
      this.pointerState.isMiddlePressed = false;
      if (this.canvas) this.canvas.style.cursor = 'default';
      this.canvas?.releasePointerCapture(e.pointerId);
      console.log('MMB released');
    }
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 1 : -1;
    if (this.currentMode === CameraMode.ORBIT && this.onOrbitZoom) {
      this.onOrbitZoom(delta);
    }
  }

  public setOrbitCallbacks(
    onRotate: (dx: number, dy: number) => void,
    onPan: (dx: number, dy: number) => void,
    onZoom: (delta: number) => void
  ): void {
    this.onOrbitRotate = onRotate;
    this.onOrbitPan = onPan;
    this.onOrbitZoom = onZoom;
  }

  public setMode(mode: CameraMode): void {
    this.currentMode = mode;
    this.pointerState.isRightPressed = false;
    this.pointerState.isMiddlePressed = false;
  }

  public canInteractWithUI(): boolean {
    return !this.pointerState.isRightPressed && !this.pointerState.isMiddlePressed;
  }

  public dispose(): void {
    this.removeCanvasListeners();
    this.logger.info('CameraInputHandler disposed');
  }
}