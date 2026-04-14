import { Logger } from "@core/logger/logger";
import { CameraMode } from "@shared/types";
import { ICameraInputHandler, ICameraManager } from "@shared/interfaces";

/**
 * Обработчик ввода камеры (ПКМ, СКМ, колёсико, тач-жесты)
 * Перехватывает события canvas и передаёт дельты в CameraManager
 * 
 * Мобильные жесты:
 * - Один палец: вращение камеры
 * - Два пальца (движение): панорамирование
 * - Два пальца (щипок): масштабирование
 */
export class CameraInputHandler implements ICameraInputHandler {
  private canvas: HTMLCanvasElement | null = null;
  private currentMode: CameraMode = CameraMode.ORBIT;
  private logger: Logger;

  private readonly ROTATION_SENSITIVITY = 1.0;
  private readonly PAN_SENSITIVITY = 1.0;
  private readonly TOUCH_ROTATION_SENSITIVITY = 0.8;
  private readonly TOUCH_PAN_SENSITIVITY = 0.8;
  private readonly PINCH_SENSITIVITY = 0.5;

  // Desktop state
  private isRightPressed = false;
  private isMiddlePressed = false;
  private lastX = 0;
  private lastY = 0;

  // Mobile touch state
  private activeTouchPoints: Map<number, Touch> = new Map();
  private lastTouchDistance: number = 0;
  private isTouching = false;

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
    canvas.style.webkitUserSelect = 'none';

    // Desktop events
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    // Mobile touch events
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });

    this.logger.info('CameraInputHandler attached to canvas');
  }

  private removeCanvasListeners(): void {
    if (!this.canvas) return;

    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
  }

  // ========== Desktop Handlers ==========

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

  // ========== Mobile Touch Handlers ==========

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();

    // Сохраняем все точки касания
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch) {
        this.activeTouchPoints.set(touch.identifier, touch);
      }
    }

    this.isTouching = true;

    // Если два пальца - запоминаем расстояние для pinch
    if (this.activeTouchPoints.size === 2) {
      const points = Array.from(this.activeTouchPoints.values());
      if (points[0] && points[1]) {
        this.lastTouchDistance = this.getTouchDistance(points[0], points[1]);
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isTouching) return;

    e.preventDefault();
    e.stopPropagation();

    // Обновляем точки касания
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch) {
        this.activeTouchPoints.set(touch.identifier, touch);
      }
    }

    const touchPoints = Array.from(this.activeTouchPoints.values());

    // Один палец - вращение камеры
    if (touchPoints.length === 1) {
      const touch = touchPoints[0];
      if (touch) {
        const deltaX = (touch.clientX - this.lastX) * this.TOUCH_ROTATION_SENSITIVITY;
        const deltaY = (touch.clientY - this.lastY) * this.TOUCH_ROTATION_SENSITIVITY;

        if (deltaX !== 0 || deltaY !== 0) {
          this.onOrbitRotate?.(-deltaX, -deltaY);
          this.lastX = touch.clientX;
          this.lastY = touch.clientY;
        }
      }
    }
    // Два пальца - панорамирование и pinch-зум
    else if (touchPoints.length === 2) {
      const touch1 = touchPoints[0];
      const touch2 = touchPoints[1];

      if (touch1 && touch2) {
        // Вычисляем текущее расстояние между пальцами
        const currentDistance = this.getTouchDistance(touch1, touch2);
        const distanceDelta = this.lastTouchDistance - currentDistance;

        // Pinch zoom (изменение расстояния)
        if (Math.abs(distanceDelta) > 2) { // Мёртвая зона 2px
          const zoomDelta = distanceDelta * this.PINCH_SENSITIVITY;
          if (this.currentMode === CameraMode.ORBIT && this.onOrbitZoom) {
            this.onOrbitZoom(zoomDelta);
          }
          this.lastTouchDistance = currentDistance;
        }

        // Панорамирование (среднее движение двух пальцев)
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        const deltaX = (centerX - this.lastX) * this.TOUCH_PAN_SENSITIVITY;
        const deltaY = (centerY - this.lastY) * this.TOUCH_PAN_SENSITIVITY;

        if (deltaX !== 0 || deltaY !== 0) {
          this.onOrbitPan?.(deltaX, deltaY);
          this.lastX = centerX;
          this.lastY = centerY;
        }
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    // Удаляем завершённые касания
    for (const touch of e.changedTouches) {
      this.activeTouchPoints.delete(touch.identifier);
    }

    // Если все касания завершены - сбрасываем состояние
    if (this.activeTouchPoints.size === 0) {
      this.isTouching = false;
      this.lastX = 0;
      this.lastY = 0;
      this.lastTouchDistance = 0;
    }
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ========== Common Methods ==========

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
    this.isTouching = false;
    this.activeTouchPoints.clear();
    this.lastTouchDistance = 0;
  }

  public dispose(): void {
    this.removeCanvasListeners();
    this.activeTouchPoints.clear();
  }
}