import { ArcRotateCamera, UniversalCamera, Vector3 } from "@babylonjs/core";
import { Logger } from "@core/logger/logger";
import { CameraMode } from "@shared/types";
import { ICameraInputHandler, ICameraManager } from "@shared/interfaces";
import { CAMERA } from "@shared/constants";

/**
 * Обработчик ввода камеры с поддержкой двух режимов:
 * - Orbit Mode: ArcRotateCamera - вращение вокруг pivot точки (без панорамирования)
 * - Free Flight Mode: UniversalCamera - свободный полёт с инвертированным управлением
 */
export class CameraInputHandler implements ICameraInputHandler {
  private canvas: HTMLCanvasElement | null = null;
  private logger: Logger;
  private orbitCamera: ArcRotateCamera | null = null;
  private flightCamera: UniversalCamera | null = null;
  private currentMode: CameraMode = CameraMode.FREE_FLIGHT;

  // Desktop state
  private isRightPressed = false;
  private isMiddlePressed = false;
  private lastX = 0;
  private lastY = 0;

  // Mobile touch state
  private activeTouchPoints: Map<number, Touch> = new Map();
  private lastTouchDistance: number = 0;
  private lastTouchCenterX: number = 0;
  private lastTouchCenterY: number = 0;
  private isTouching = false;
  private touchPanActive = false;
  private readonly boundPointerDown = (e: PointerEvent) => this.onPointerDown(e);
  private readonly boundPointerMove = (e: PointerEvent) => this.onPointerMove(e);
  private readonly boundPointerUp = (e: PointerEvent) => this.onPointerUp(e);
  private readonly boundContextMenu = (e: MouseEvent) => this.onContextMenu(e);
  private readonly boundWheel = (e: WheelEvent) => this.onWheel(e);
  private readonly boundTouchStart = (e: TouchEvent) => this.onTouchStart(e);
  private readonly boundTouchMove = (e: TouchEvent) => this.onTouchMove(e);
  private readonly boundTouchEnd = (e: TouchEvent) => this.onTouchEnd(e);

  constructor() {
    this.logger = Logger.getInstance().getLogger('CameraInputHandler');
  }

  public setCameraManager(cameraManager: ICameraManager): void {
    this.orbitCamera = cameraManager.camera;
    this.flightCamera = cameraManager.flightCamera;
    this.updateSensitivity(this.currentMode);
  }

  public setOrbitCamera(orbitCamera: ArcRotateCamera): void {
    this.orbitCamera = orbitCamera;
  }

  public setFlightCamera(flightCamera: UniversalCamera): void {
    this.flightCamera = flightCamera;
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
    canvas.addEventListener('pointerdown', this.boundPointerDown);
    canvas.addEventListener('pointermove', this.boundPointerMove);
    canvas.addEventListener('pointerup', this.boundPointerUp);
    canvas.addEventListener('contextmenu', this.boundContextMenu);
    canvas.addEventListener('wheel', this.boundWheel, { passive: false });

    // Mobile touch events
    canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.boundTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.boundTouchEnd, { passive: false });

    this.logger.info('CameraInputHandler attached to canvas');
  }

  private removeCanvasListeners(): void {
    if (!this.canvas) return;

    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
    this.canvas.removeEventListener('pointermove', this.boundPointerMove);
    this.canvas.removeEventListener('pointerup', this.boundPointerUp);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    this.canvas.removeEventListener('touchmove', this.boundTouchMove);
    this.canvas.removeEventListener('touchend', this.boundTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.boundTouchEnd);
  }

  public setMode(mode: CameraMode): void {
    this.currentMode = mode;
    this.isRightPressed = false;
    this.isMiddlePressed = false;
    this.isTouching = false;
    this.touchPanActive = false;
    this.activeTouchPoints.clear();
    this.lastTouchDistance = 0;
    this.updateSensitivity(mode);
    this.logger.info(`Camera input mode changed to: ${mode}`);
  }

  private getCurrentCamera(): ArcRotateCamera | UniversalCamera | null {
    return this.currentMode === CameraMode.ORBIT
      ? this.orbitCamera
      : this.flightCamera;
  }

  public updateSensitivity(mode: CameraMode): void {
    // Настройки чувствительности для разных режимов
    if (mode === CameraMode.ORBIT) {
      // Для Orbit - нет панорамирования
    }
    // Для Free Flight чувствительность уже задана в константах
  }

  // ========== Desktop Handlers ==========

  private onPointerDown(e: PointerEvent): void {
    if (e.button === 2) { // ПКМ - вращение
      this.isRightPressed = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      e.preventDefault();
      e.stopPropagation();
      this.canvas?.setPointerCapture(e.pointerId);
      if (this.canvas) this.canvas.style.cursor = 'grabbing';
    } else if (e.button === 1 && this.currentMode !== CameraMode.ORBIT) { // СКМ - pan
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
    if (!this.getCurrentCamera()) return;

    if (this.isRightPressed) {
      const deltaX = e.clientX - this.lastX;
      const deltaY = e.clientY - this.lastY;

      if (deltaX !== 0 || deltaY !== 0) {
        this.handleRotation(deltaX, deltaY);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (this.isMiddlePressed && this.currentMode !== CameraMode.ORBIT) {
      const deltaX = e.clientX - this.lastX;
      const deltaY = e.clientY - this.lastY;

      if (deltaX !== 0 || deltaY !== 0) {
        this.handlePan(deltaX, deltaY);
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
    if (!this.getCurrentCamera()) return;

    e.preventDefault();
    e.stopPropagation();
    // Инвертируем zoom для Free Flight
    const delta = this.currentMode === CameraMode.FREE_FLIGHT
      ? (e.deltaY > 0 ? -1 : 1)
      : (e.deltaY > 0 ? 1 : -1);
    this.handleZoom(delta);
  }

  // ========== Логика вращения/перемещения для разных камер ==========

  private handleRotation(deltaX: number, deltaY: number): void {
    if (this.currentMode === CameraMode.ORBIT) {
      this.handleOrbitRotation(deltaX, deltaY);
    } else if (this.currentMode === CameraMode.TOP_DOWN) {
      this.handleTopDownRotation(deltaX, deltaY);
    } else if (this.currentMode === CameraMode.FREE_FLIGHT) {
      // Инвертируем вращение для Free Flight
      this.handleFlightRotation(-deltaX, -deltaY);
    }
  }

  private handleOrbitRotation(deltaX: number, deltaY: number): void {
    if (!this.orbitCamera) return;

    this.orbitCamera.alpha -= deltaX * CAMERA.ORBIT.ROTATION_SENSITIVITY;
    this.orbitCamera.beta -= deltaY * CAMERA.ORBIT.ROTATION_SENSITIVITY;
    this.orbitCamera.beta = Math.max(CAMERA.ORBIT.MIN_BETA, Math.min(CAMERA.ORBIT.MAX_BETA, this.orbitCamera.beta));
  }

  private handleFlightRotation(deltaX: number, deltaY: number): void {
    if (!this.flightCamera) return;

    this.flightCamera.rotation.y -= deltaX * CAMERA.FREE_FLIGHT.ROTATION_SENSITIVITY;
    this.flightCamera.rotation.x -= deltaY * CAMERA.FREE_FLIGHT.ROTATION_SENSITIVITY;
    this.flightCamera.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.flightCamera.rotation.x));
  }

  private handlePan(deltaX: number, deltaY: number): void {
    if (this.currentMode === CameraMode.TOP_DOWN) {
      this.handleTopDownPan(deltaX, deltaY);
    } else if (this.currentMode === CameraMode.FREE_FLIGHT) {
      this.handleFlightMove(deltaX, deltaY);
    }
    // Orbit не имеет панорамирования
  }

  private handleTopDownPan(deltaX: number, deltaY: number): void {
    if (!this.flightCamera) return;

    const screenUp = this.getTopDownScreenUp();
    const right = Vector3.Cross(Vector3.Down(), screenUp).normalize();
    const movement = right.scale(deltaX * CAMERA.TOP_DOWN.PAN_SENSITIVITY)
      .add(screenUp.scale(deltaY * CAMERA.TOP_DOWN.PAN_SENSITIVITY));

    this.flightCamera.position = this.flightCamera.position.add(movement);
    this.flightCamera.setTarget(this.flightCamera.getTarget().add(movement));
  }

  private handleTopDownRotation(deltaX: number, _deltaY: number): void {
    if (!this.flightCamera) return;

    const angle = -deltaX * CAMERA.TOP_DOWN.ROTATION_SENSITIVITY;
    const maxAnglePerFrame = 0.05;
    const clampedAngle = Math.max(-maxAnglePerFrame, Math.min(maxAnglePerFrame, angle));

    const currentUp = this.getTopDownScreenUp();

    const cos = Math.cos(clampedAngle);
    const sin = Math.sin(clampedAngle);
    const rotatedUp = new Vector3(
      currentUp.x * cos - currentUp.z * sin,
      0,
      currentUp.x * sin + currentUp.z * cos
    ).normalize();

    this.flightCamera.upVector = rotatedUp;
    this.flightCamera.setTarget(this.flightCamera.getTarget().clone());
  }

  private getTopDownScreenUp(): Vector3 {
    if (!this.flightCamera) {
      return new Vector3(0, 0, -1);
    }

    const projectedUp = new Vector3(this.flightCamera.upVector.x, 0, this.flightCamera.upVector.z);
    if (projectedUp.lengthSquared() > 0.0001) {
      return projectedUp.normalize();
    }

    const forward = this.flightCamera.getDirection(Vector3.Forward());
    const projectedForward = new Vector3(forward.x, 0, forward.z);
    if (projectedForward.lengthSquared() > 0.0001) {
      return projectedForward.normalize();
    }

    return new Vector3(0, 0, -1);
  }

  private handleFlightMove(deltaX: number, deltaY: number): void {
    if (!this.flightCamera) return;

    const forward = this.flightCamera.getDirection(Vector3.Forward());
    const right = Vector3.Cross(forward, Vector3.Up()).normalize();
    const up = Vector3.Up();

    this.flightCamera.position = this.flightCamera.position
      .subtract(right.scale(deltaX * CAMERA.FREE_FLIGHT.MOVE_SENSITIVITY * -1)) // -1 для инвертирования по X
      .add(up.scale(deltaY * CAMERA.FREE_FLIGHT.MOVE_SENSITIVITY));
  }

  private handleZoom(delta: number): void {
    if (this.currentMode === CameraMode.ORBIT) {
      this.handleOrbitZoom(delta);
    } else if (this.currentMode === CameraMode.TOP_DOWN) {
      this.handleTopDownZoom(delta);
    } else if (this.currentMode === CameraMode.FREE_FLIGHT) {
      this.handleFlightZoom(delta);
    }
  }

  private handleOrbitZoom(delta: number): void {
    if (!this.orbitCamera) return;

    this.orbitCamera.radius += delta * CAMERA.ORBIT.ZOOM_SENSITIVITY;
    this.orbitCamera.radius = Math.max(
      this.orbitCamera.lowerRadiusLimit || CAMERA.ORBIT.MIN_RADIUS,
      Math.min(this.orbitCamera.upperRadiusLimit || CAMERA.ORBIT.MAX_RADIUS, this.orbitCamera.radius)
    );
  }

  private handleTopDownZoom(delta: number): void {
    if (!this.flightCamera) return;

    // В 2D режиме изменяем Y-координату для изменения масштаба
    const zoomFactor = delta > 0 ? 1.1 : 0.9; // Увеличение/уменьшение
    const newPosition = this.flightCamera.position.clone();
    const target = this.flightCamera.getTarget().clone();

    // Масштабирование расстояния до цели
    const direction = newPosition.subtract(target).scale(zoomFactor);
    const minDistance = CAMERA.TOP_DOWN.MIN_DISTANCE || 5;
    const maxDistance = CAMERA.TOP_DOWN.MAX_DISTANCE || 100;

    const newDistance = Math.max(minDistance, Math.min(maxDistance, direction.length()));
    const normalizedDirection = direction.normalize();

    this.flightCamera.position = target.add(normalizedDirection.scale(newDistance));
  }

  private handleFlightZoom(delta: number): void {
    if (!this.flightCamera) return;

    const forward = this.flightCamera.getDirection(Vector3.Forward());
    this.flightCamera.position = this.flightCamera.position.add(
      forward.scale(delta * CAMERA.FREE_FLIGHT.ZOOM_SENSITIVITY)
    );
  }

  // ========== Mobile Touch Handlers ==========

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch) {
        this.activeTouchPoints.set(touch.identifier, touch);
      }
    }

    this.isTouching = true;

    if (this.activeTouchPoints.size === 1) {
      const touch = Array.from(this.activeTouchPoints.values())[0];
      if (touch) {
        this.lastX = touch.clientX;
        this.lastY = touch.clientY;
        this.touchPanActive = false;
      }
    } else if (this.activeTouchPoints.size === 2) {
      const points = Array.from(this.activeTouchPoints.values());
      if (points[0] && points[1]) {
        this.lastTouchDistance = this.getTouchDistance(points[0], points[1]);
        this.lastTouchCenterX = (points[0].clientX + points[1].clientX) / 2;
        this.lastTouchCenterY = (points[0].clientY + points[1].clientY) / 2;

        // Для Free Flight - два пальца это pan
        this.touchPanActive = this.currentMode === CameraMode.FREE_FLIGHT;
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isTouching || !this.getCurrentCamera()) return;

    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch) {
        this.activeTouchPoints.set(touch.identifier, touch);
      }
    }

    const touchPoints = Array.from(this.activeTouchPoints.values());

    if (touchPoints.length === 1 && !this.touchPanActive) {
      // Один палец - вращение
      const touch = touchPoints[0];
      if (touch) {
        const deltaX = touch.clientX - this.lastX;
        const deltaY = touch.clientY - this.lastY;

        if (deltaX !== 0 || deltaY !== 0) {
          this.handleRotation(deltaX, deltaY);
          this.lastX = touch.clientX;
          this.lastY = touch.clientY;
        }
      }
    } else if (touchPoints.length === 2) {
      const touch1 = touchPoints[0];
      const touch2 = touchPoints[1];

      if (touch1 && touch2) {
        const currentDistance = this.getTouchDistance(touch1, touch2);
        const distanceDelta = currentDistance - this.lastTouchDistance;

        // Pinch zoom
        if (Math.abs(distanceDelta) > 2) {
          const zoomDelta = distanceDelta * 0.02;
          this.handleZoom(zoomDelta);
          this.lastTouchDistance = currentDistance;
        }

        // Pan для Free Flight
        if (this.touchPanActive) {
          const centerX = (touch1.clientX + touch2.clientX) / 2;
          const centerY = (touch1.clientY + touch2.clientY) / 2;
          const deltaX = centerX - this.lastTouchCenterX;
          const deltaY = centerY - this.lastTouchCenterY;

          if (deltaX !== 0 || deltaY !== 0) {
            this.handlePan(deltaX, deltaY);
          }
        }

        this.lastTouchCenterX = (touch1.clientX + touch2.clientX) / 2;
        this.lastTouchCenterY = (touch1.clientY + touch2.clientY) / 2;
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    for (const touch of e.changedTouches) {
      this.activeTouchPoints.delete(touch.identifier);
    }

    if (this.activeTouchPoints.size === 0) {
      this.isTouching = false;
      this.touchPanActive = false;
      this.lastX = 0;
      this.lastY = 0;
      this.lastTouchDistance = 0;
      this.lastTouchCenterX = 0;
      this.lastTouchCenterY = 0;
    } else if (this.activeTouchPoints.size === 1) {
      // Переключаемся обратно в режим вращения
      this.touchPanActive = false;
      const touch = Array.from(this.activeTouchPoints.values())[0];
      if (touch) {
        this.lastX = touch.clientX;
        this.lastY = touch.clientY;
      }
    }
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public dispose(): void {
    this.removeCanvasListeners();
    this.activeTouchPoints.clear();
  }
}
