import { Logger } from "../../core/logger/Logger";
import { CameraMode } from "../../shared/types";
import { ICameraInputHandler, ICameraManager } from "@shared/interfaces";

/**
 * Обработчик ввода камеры (ПКМ, СКМ, колёсико)
 * Перехватывает события canvas и передаёт дельты в CameraManager
 */
export class CameraInputHandler implements ICameraInputHandler {
  private canvas: HTMLCanvasElement | null = null;
  private currentMode: CameraMode = CameraMode.ORBIT;
  private logger: Logger;

  private readonly ROTATION_SENSITIVITY = 1.0;
  private readonly PAN_SENSITIVITY = 1.0;

  private isRightPressed = false;
  private isMiddlePressed = false;
  private lastX = 0;
  private lastY = 0;

  private onOrbitRotate?: (dx: number, dy: number) => void;
  private onOrbitPan?: (dx: number, dy: number) => void;
  private onOrbitZoom?: (delta: number) => void;

  constructor() {
    this.logger = Logger.getInstance().getLogger('CameraInputHandler');
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
    if (e.button === 2) {
      this.isRightPressed = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      e.preventDefault();
      e.stopPropagation();
      this.canvas?.setPointerCapture(e.pointerId);
      if (this.canvas) this.canvas.style.cursor = 'grabbing';
    } else if (e.button === 1) {
      this.isMiddlePressed = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      e.preventDefault();
      e.stopPropagation();
      this.canvas?.setPointerCapture(e.pointerId);
      if (this.canvas) this.canvas.style.cursor = 'move';
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.isRightPressed) {
      const deltaX = (e.clientX - this.lastX) * this.ROTATION_SENSITIVITY;
      const deltaY = (e.clientY - this.lastY) * this.ROTATION_SENSITIVITY;
      if (deltaX !== 0 || deltaY !== 0) {
        this.onOrbitRotate?.(-deltaX, -deltaY);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (this.isMiddlePressed) {
      const deltaX = (e.clientX - this.lastX) * this.PAN_SENSITIVITY;
      const deltaY = (e.clientY - this.lastY) * this.PAN_SENSITIVITY;
      if (deltaX !== 0 || deltaY !== 0) {
        this.onOrbitPan?.(deltaX, deltaY);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.button === 2) {
      this.isRightPressed = false;
      if (this.canvas) this.canvas.style.cursor = 'default';
      this.canvas?.releasePointerCapture(e.pointerId);
    } else if (e.button === 1) {
      this.isMiddlePressed = false;
      if (this.canvas) this.canvas.style.cursor = 'default';
      this.canvas?.releasePointerCapture(e.pointerId);
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
    this.isRightPressed = false;
    this.isMiddlePressed = false;
  }

  public dispose(): void {
    this.removeCanvasListeners();
  }
}