import { Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { CameraModeManager } from "./CameraModeManager";
import { CameraAnimator } from "./CameraAnimator";
import { CameraInputHandler } from "./CameraInputHandler";
import { CameraMode, BuildingBounds, CameraTransform } from "./types";

export class CameraManager {
  private static _instance: CameraManager;
  private _scene: Scene;
  private _camera: ArcRotateCamera;
  private _modeManager: CameraModeManager;
  private _animator: CameraAnimator;
  private _inputHandler: CameraInputHandler;
  
  // Текущий этаж (для UI)
  private _currentFloor: number = 1;
  
  // Сохраняем позицию инициализации для сброса
  private _initialTransform: CameraTransform | null = null;

  private constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this._scene = scene;
    
    this._camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 3,
      40,
      Vector3.Zero(),
      scene
    );

    this._camera.maxZ = 2000;
  
    this._camera.lowerRadiusLimit = 5;
    this._camera.upperRadiusLimit = 500;
    
    this._camera.attachControl(canvas, true);
    
    this._modeManager = new CameraModeManager(this._camera);
    this._animator = new CameraAnimator(this._camera, scene);
    this._inputHandler = new CameraInputHandler(this._camera, canvas);
    
    scene.activeCamera = this._camera;
    console.log("CameraManager initialized");
  }

  public static getInstance(scene: Scene, canvas: HTMLCanvasElement): CameraManager {
    if (!CameraManager._instance) {
      CameraManager._instance = new CameraManager(scene, canvas);
    }
    return CameraManager._instance;
  }

  public setBuildingBounds(bounds: BuildingBounds): void {
    this._modeManager.setBuildingBounds(bounds);
  }

  /**
   * Инициализация камеры с кастомной анимацией выезда
   */
  public async initialize(customStart?: CameraTransform, customEnd?: CameraTransform): Promise<void> {
    await this._animator.playIntroAnimation(this._modeManager.bounds, customStart, customEnd);
    
    // Сохраняем финальную позицию после анимации как позицию для сброса
    this._initialTransform = {
      alpha: this._camera.alpha,
      beta: this._camera.beta,
      radius: this._camera.radius,
      target: this._camera.target.clone()
    };
    
    console.log("✅ Камера готова, позиция для сброса сохранена");
  }

  public async toggleCameraMode(): Promise<void> {
    const oldMode = this._modeManager.cameraMode;
    this._modeManager.toggleCameraMode();
    
    if (oldMode === CameraMode.MODE_3D) {
      await this._animator.animateTo(this._modeManager.get2DTransform(), 1.0);
    } else {
      await this._animator.animateTo(this._modeManager.get3DTransform(), 1.0);
    }
  }

  /**
   * Сброс камеры в позицию инициализации
   */
  public async resetCamera(): Promise<void> {
    if (!this._initialTransform) {
      console.warn("Позиция для сброса не сохранена");
      return;
    }
    
    // Если мы в 2D режиме, переключаемся в 3D (без анимации)
    if (this._modeManager.cameraMode === CameraMode.MODE_2D) {
      this._modeManager.toggleCameraMode(); // Переключаем режим без анимации
    }
    
    // Анимируем к сохранённой позиции инициализации
    await this._animator.animateTo(this._initialTransform, 1.0);
    console.log("🔄 Камера сброшена в позицию инициализации");
  }

  // Методы для управления этажами
  public nextFloor(): void {
    const maxFloor = Math.floor(this._modeManager.bounds.maxY / 3);
    if (this._currentFloor < maxFloor) {
      this._currentFloor++;
      console.log(`Camera floor: ${this._currentFloor}`);
    }
  }

  public previousFloor(): void {
    if (this._currentFloor > 1) {
      this._currentFloor--;
      console.log(`Camera floor: ${this._currentFloor}`);
    }
  }

  public canInteractWithUI(): boolean {
    return !this._animator.isAnimating;
  }

  // Геттеры
  public get camera(): ArcRotateCamera {
    return this._camera;
  }

  public get modeManager(): CameraModeManager {
    return this._modeManager;
  }

  public get isAnimating(): boolean {
    return this._animator.isAnimating;
  }

  public get cameraMode(): CameraMode {
    return this._modeManager.cameraMode;
  }

  public get currentFloor(): number {
    return this._currentFloor;
  }
}