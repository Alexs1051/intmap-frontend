import { injectable } from "inversify";
import { Logger } from "../../core/logger/Logger";
import { CameraMode } from "../../shared/types";
import { ICameraInputHandler } from "@shared/interfaces";

interface TouchState {
  identifier: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  type: 'rotate' | 'pan' | 'zoom';
}

@injectable()
export class CameraInputHandler implements ICameraInputHandler {
  private readonly logger = Logger.getInstance().getLogger('CameraInputHandler');
  
  private isLeftPressed: boolean = false;
  private isRightPressed: boolean = false;
  private activeTouches: Map<number, TouchState> = new Map();
  private isTouchDevice: boolean;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private currentMode: CameraMode = CameraMode.ORBIT;
  private canvas: HTMLCanvasElement | null = null;
  
  private onOrbitRotate?: (dx: number, dy: number) => void;
  private onOrbitPan?: (dx: number, dy: number) => void;
  private onOrbitZoom?: (delta: number) => void;

  constructor() {
    this.isTouchDevice = this.detectTouchDevice();
    this.setupCanvasListeners();
    this.logger.info(`Input handler initialized, touch device: ${this.isTouchDevice}`);
  }

  private detectTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private setupCanvasListeners(): void {
    const canvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
    if (!canvas) {
      this.logger.warn('Canvas not found for input handling');
      return;
    }
    this.attachToCanvas(canvas as HTMLCanvasElement);
  }

  public attachToCanvas(canvas: HTMLCanvasElement): void {
    if (this.canvas) {
      this.removeCanvasListeners();
    }
    
    this.canvas = canvas;
    
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));

    if (this.isTouchDevice) {
      canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
      canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
      canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    }
  }

  private removeCanvasListeners(): void {
    if (!this.canvas) return;
    
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas!.getBoundingClientRect();
    this.lastMouseX = e.clientX - rect.left;
    this.lastMouseY = e.clientY - rect.top;

    switch (e.button) {
      case 0: this.isLeftPressed = true; break;
      case 2: this.isRightPressed = true; e.preventDefault(); break;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    switch (e.button) {
      case 0: this.isLeftPressed = false; break;
      case 2: this.isRightPressed = false; break;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas!.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const deltaX = currentX - this.lastMouseX;
    const deltaY = currentY - this.lastMouseY;
    
    if (deltaX !== 0 || deltaY !== 0) {
      this.processMouseMovement(deltaX, deltaY);
    }
    
    this.lastMouseX = currentX;
    this.lastMouseY = currentY;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY > 0 ? 1 : -1;
    if (this.currentMode === CameraMode.ORBIT && this.onOrbitZoom) {
      this.onOrbitZoom(delta);
    }
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private onTouchStart(e: TouchEvent): void {
      e.preventDefault();
      const rect = this.canvas!.getBoundingClientRect();
      
      for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          if (!touch) continue;
          
          this.activeTouches.set(touch.identifier, {
              identifier: touch.identifier,
              startX: touch.clientX - rect.left,
              startY: touch.clientY - rect.top,
              lastX: touch.clientX - rect.left,
              lastY: touch.clientY - rect.top,
              type: this.determineTouchType(e.touches.length)
          });
      }
  }

  private onTouchMove(e: TouchEvent): void {
      e.preventDefault();
      const rect = this.canvas!.getBoundingClientRect();
      
      for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          if (!touch) continue;
          
          const state = this.activeTouches.get(touch.identifier);
          if (state) {
              const currentX = touch.clientX - rect.left;
              const currentY = touch.clientY - rect.top;
              this.processTouchMovement(state.type, currentX - state.lastX, currentY - state.lastY);
              
              state.lastX = currentX;
              state.lastY = currentY;
          }
      }
  }

  private onTouchEnd(e: TouchEvent): void {
      for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch) {
              this.activeTouches.delete(touch.identifier);
          }
      }
  }

  private determineTouchType(touchCount: number): 'rotate' | 'pan' | 'zoom' {
    if (touchCount === 1) return 'rotate';
    if (touchCount === 2) return 'pan';
    return 'zoom';
  }

  private processMouseMovement(deltaX: number, deltaY: number): void {
    if (this.currentMode !== CameraMode.ORBIT) return;
    
    if (this.isLeftPressed && this.onOrbitRotate) {
      this.onOrbitRotate(deltaX, deltaY);
    } else if (this.isRightPressed && this.onOrbitPan) {
      this.onOrbitPan(deltaX, deltaY);
    }
  }

  private processTouchMovement(type: 'rotate' | 'pan' | 'zoom', deltaX: number, deltaY: number): void {
    if (this.currentMode !== CameraMode.ORBIT) return;
    
    switch (type) {
      case 'rotate':
        this.onOrbitRotate?.(deltaX, deltaY);
        break;
      case 'pan':
        this.onOrbitPan?.(deltaX, deltaY);
        break;
      case 'zoom':
        this.onOrbitZoom?.(deltaY > 0 ? 1 : -1);
        break;
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
    this.isLeftPressed = false;
    this.isRightPressed = false;
    this.activeTouches.clear();
  }

  public canInteractWithUI(): boolean {
    return !this.isLeftPressed && !this.isRightPressed && this.activeTouches.size === 0;
  }

  public dispose(): void {
    this.removeCanvasListeners();
    this.logger.info('CameraInputHandler disposed');
  }
}