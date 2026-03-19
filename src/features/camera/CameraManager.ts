import { Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { CameraModeManager } from "./CameraModeManager";
import { CameraAnimator } from "./CameraAnimator";
import { CameraInputHandler } from "./CameraInputHandler";
import { CameraMode, CameraTransform, BuildingDimensions } from "./types";
import { logger } from "../../core/logger/Logger";

const cameraLogger = logger.getLogger('CameraManager');

export class CameraManager {
  private static _instance: CameraManager;
  private readonly _camera: ArcRotateCamera;
  private readonly _modeManager: CameraModeManager;
  private readonly _animator: CameraAnimator;
  private readonly _inputHandler: CameraInputHandler;
  private readonly _dimensions: BuildingDimensions;
  
  private _initialTransform: CameraTransform | null = null;
  private _targetPosition: Vector3 = Vector3.Zero();

  private constructor(scene: Scene, canvas: HTMLCanvasElement) {
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
    
    this._dimensions = {
      height: 30,
      width: 30,
      depth: 30
    };
    
    this._modeManager = new CameraModeManager(this._camera, this._dimensions);
    this._animator = new CameraAnimator(this._camera, scene);
    this._inputHandler = new CameraInputHandler(this._camera, canvas);
    
    scene.activeCamera = this._camera;
    cameraLogger.info("CameraManager инициализирован");
  }

  public static getInstance(scene: Scene, canvas: HTMLCanvasElement): CameraManager {
    if (!CameraManager._instance) {
      CameraManager._instance = new CameraManager(scene, canvas);
    }
    return CameraManager._instance;
  }

  public async initialize(customStart?: CameraTransform, customEnd?: CameraTransform): Promise<void> {
    const maxDimension = Math.max(this._dimensions.height, this._dimensions.width, this._dimensions.depth);
    
    const startTransform: CameraTransform = customStart ?? {
      alpha: Math.PI / 3,
      beta: Math.PI / 3.5,
      radius: maxDimension * 3.5 * 2.0,
      target: this._targetPosition.clone()
    };

    const endTransform: CameraTransform = customEnd ?? {
      alpha: -Math.PI / 2.5,
      beta: Math.PI / 4,
      radius: maxDimension * 2.2 * 2.0,
      target: this._targetPosition.clone()
    };

    this._camera.alpha = startTransform.alpha;
    this._camera.beta = startTransform.beta;
    this._camera.radius = startTransform.radius;
    this._camera.target.copyFrom(startTransform.target);
    
    await this._animator.animateTo(endTransform, 2.0);
    
    this._initialTransform = {
      alpha: this._camera.alpha,
      beta: this._camera.beta,
      radius: this._camera.radius,
      target: this._camera.target.clone()
    };
    
    cameraLogger.info(`Камера готова, дистанция: ${this._camera.radius.toFixed(1)}`);
  }

  /**
   * Рассчитать оптимальную дистанцию для обзора всего маршрута
   */
  private calculateOptimalDistanceForRoute(positions: Vector3[]): number {
    if (positions.length === 0) return 30;
    
    // Находим bounding box маршрута
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
      minZ = Math.min(minZ, pos.z);
      maxZ = Math.max(maxZ, pos.z);
    });
    
    const width = maxX - minX;
    const height = maxY - minY;
    const depth = maxZ - minZ;
    
    // Центр маршрута
    const center = new Vector3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    );
    
    this._targetPosition = center;
    this._modeManager.setTarget(center);
    
    // Вычисляем необходимую дистанцию (по теореме Пифагора)
    const maxDimension = Math.max(width, height, depth);
    
    // Добавляем запас 30% для комфортного обзора
    const optimalDistance = Math.max(30, maxDimension * 1.3);
    
    cameraLogger.debug(`Маршрут: размеры ${width.toFixed(1)}x${height.toFixed(1)}x${depth.toFixed(1)}, дистанция: ${optimalDistance.toFixed(1)}`);
    
    return optimalDistance;
  }

  /**
   * Плавный переход к обзору всего маршрута от текущей позиции камеры
   */
  public async focusOnRoute(positions: Vector3[], duration: number = 2.0): Promise<void> {
      if (positions.length === 0) {
        cameraLogger.warn("Нет точек для обзора маршрута");
        return;
      }
      
      // Рассчитываем оптимальную позицию
      const optimal = this.calculateOptimalCameraPosition(positions);
      
      // Текущая позиция
      const current = {
        alpha: this._camera.alpha,
        beta: this._camera.beta,
        radius: this._camera.radius,
        target: this._camera.target.clone()
      };
      
      // Создаём промежуточную точку выше и дальше для плавности
      const midTransform: CameraTransform = {
        alpha: (current.alpha + optimal.transform.alpha) / 2,
        beta: (current.beta + optimal.transform.beta) / 2,
        radius: Math.max(current.radius, optimal.transform.radius) * 1.2,
        target: Vector3.Lerp(current.target, optimal.center, 0.5)
      };
      
      cameraLogger.info(`Плавный переход к маршруту (с промежуточной точкой)`);
      
      // Анимация до промежуточной точки (быстрее)
      await this._animator.animateTo(midTransform, duration * 0.4);
      
      // Анимация до целевой точки (медленнее)
      await this._animator.animateTo(optimal.transform, duration * 0.6);
      
      cameraLogger.info(`Фокус на маршрут завершён`);
  }

  /**
   * Рассчитать оптимальную позицию камеры для обзора всего маршрута
   */
  private calculateOptimalCameraPosition(positions: Vector3[]): { transform: CameraTransform; center: Vector3 } {
    if (positions.length === 0) {
      return {
        transform: {
          alpha: this._camera.alpha,
          beta: this._camera.beta,
          radius: this._camera.radius,
          target: this._camera.target.clone()
        },
        center: this._targetPosition.clone()
      };
    }
    
    // Находим bounding box маршрута
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
      minZ = Math.min(minZ, pos.z);
      maxZ = Math.max(maxZ, pos.z);
    });
    
    const width = maxX - minX;
    const height = maxY - minY;
    const depth = maxZ - minZ;
    
    // Центр маршрута
    const center = new Vector3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    );
    
    // Сохраняем центр для целевой позиции
    this._targetPosition = center;
    this._modeManager.setTarget(center);
    
    // Вычисляем необходимую дистанцию
    const maxDimension = Math.max(width, height, depth);
    
    // Добавляем запас 40% для комфортного обзора (немного больше, чем при инициализации)
    const optimalDistance = Math.max(30, maxDimension * 1.4);
    
    // Выбираем угол обзора в зависимости от соотношения размеров
    let alpha = -Math.PI / 2.5; // По умолчанию
    let beta = Math.PI / 3.5;   // По умолчанию
    
    // Если маршрут очень вытянут по горизонтали, корректируем угол
    if (width > depth * 2) {
      alpha = -Math.PI / 2; // Смотрим прямо вдоль X
    } else if (depth > width * 2) {
      alpha = 0; // Смотрим прямо вдоль Z
    }
    
    // Если маршрут очень высокий, корректируем вертикальный угол
    if (height > maxDimension * 0.7) {
      beta = Math.PI / 2.5; // Смотрим больше сверху
    }
    
    cameraLogger.debug(`Маршрут: размеры ${width.toFixed(1)}x${height.toFixed(1)}x${depth.toFixed(1)}, дистанция: ${optimalDistance.toFixed(1)}`);
    
    return {
      transform: {
        alpha,
        beta,
        radius: optimalDistance,
        target: center.clone()
      },
      center
    };
  }

  public setTargetPosition(position: Vector3): void {
    this._targetPosition = position.clone();
    this._modeManager.setTarget(position);
  }

  public setDimensions(dimensions: BuildingDimensions): void {
    this._dimensions.height = dimensions.height;
    this._dimensions.width = dimensions.width;
    this._dimensions.depth = dimensions.depth ?? dimensions.width;
    cameraLogger.debug(`Размеры здания установлены: ${JSON.stringify(this._dimensions)}`);
  }

  public async toggleCameraMode(): Promise<void> {
    const oldMode = this._modeManager.cameraMode;
    this._modeManager.toggleCameraMode();
    
    const transform = oldMode === CameraMode.MODE_3D 
      ? this._modeManager.get2DTransform()
      : this._modeManager.get3DTransform();
      
    await this._animator.animateTo(transform, 1.0);
  }

  public async resetCamera(): Promise<void> {
    if (!this._initialTransform) {
      cameraLogger.warn("Позиция для сброса не сохранена");
      return;
    }
    
    if (this._modeManager.cameraMode === CameraMode.MODE_2D) {
      this._modeManager.toggleCameraMode();
    }
    
    await this._animator.animateTo(this._initialTransform, 1.0);
    cameraLogger.debug("Камера сброшена");
  }

  public async focusOnPoint(point: Vector3, distance: number = 8, duration: number = 1.0): Promise<void> {
    const targetTransform: CameraTransform = {
      alpha: this._camera.alpha,
      beta: this._camera.beta,
      radius: distance,
      target: point.clone()
    };
    
    await this._animator.animateTo(targetTransform, duration);
    this._modeManager.setTarget(point);
  }

  public canInteractWithUI(): boolean {
    return !this._animator.isAnimating;
  }

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

  public get dimensions(): BuildingDimensions {
    return this._dimensions;
  }

  public get targetPosition(): Vector3 {
    return this._targetPosition;
  }
}