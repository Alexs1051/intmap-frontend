import { Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { EventBus } from "../../core/events/EventBus";
import { BabylonEngine } from "../../core/engine/BabylonEngine";
import { CameraMode, CameraTransform, BuildingDimensions } from "../../shared/types";
import { CAMERA } from "../../shared/constants";
import { EventType } from "../../core/events/EventTypes";
import type { ICameraAnimator, ICameraInputHandler, ICameraManager, ICameraModeManager } from "@shared/interfaces";

@injectable()
export class CameraManager implements ICameraManager {
    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private scene: Scene;
    private _camera: ArcRotateCamera;
    
    private readonly animator: ICameraAnimator;
    private readonly modeManager: ICameraModeManager;
    private readonly inputHandler: ICameraInputHandler;
    
    private dimensions: BuildingDimensions = { height: 30, width: 30, depth: 30 };
    private isTransitioning: boolean = false;
    private isInitialized: boolean = false;
    private savedBeta: number = Math.PI / 3.5;

    private initialTransform: CameraTransform | null = null;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus,
        @inject(TYPES.BabylonEngine) private readonly babylonEngine: BabylonEngine,
        @inject(TYPES.CameraAnimator) animator: ICameraAnimator,
        @inject(TYPES.CameraModeManager) modeManager: ICameraModeManager,
        @inject(TYPES.CameraInputHandler) inputHandler: ICameraInputHandler
    ) {
        this.logger = logger.getLogger('CameraManager');
        this.eventBus = eventBus;
        this.animator = animator;
        this.modeManager = modeManager;
        this.inputHandler = inputHandler;
        
        this.scene = null as any; // Временно, будет установлен через setScene
        this._camera = null as any; // Временно
        
        this.setupInputCallbacks();
        
        this.logger.info('CameraManager initialized');
    }

    public setScene(scene: Scene): void {
        this.scene = scene;
        this._camera = this.initCamera();
        this.animator.setScene(scene);
        this.setupTargetSync();
    }

    private initCamera(): ArcRotateCamera {
        const camera = new ArcRotateCamera(
            "orbitCamera",
            -Math.PI / 2,
            Math.PI / 3.5,
            40,
            Vector3.Zero(),
            this.scene
        );
        
        camera.maxZ = 2000;
        camera.upperRadiusLimit = CAMERA.MAX_RADIUS;
        camera.lowerRadiusLimit = CAMERA.MIN_RADIUS;
        camera.lowerBetaLimit = CAMERA.MIN_BETA;
        camera.upperBetaLimit = CAMERA.MAX_BETA;
        camera.panningSensibility = 50;
        camera.wheelPrecision = CAMERA.WHEEL_PRECISION;
        camera.pinchPrecision = CAMERA.PINCH_PRECISION;
        
        this.savedBeta = camera.beta;
        
        this.scene.activeCamera = camera;
        return camera;
    }

    private setupInputCallbacks(): void {
        this.inputHandler.setOrbitCallbacks(
            (dx, dy) => this.handleRotate(dx, dy),
            (dx, dy) => this.handlePan(dx, dy),
            (delta) => this.handleZoom(delta)
        );
    }

    private setupTargetSync(): void {
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.isTransitioning && !this.animator.isAnimating) {
                this.modeManager.setPivotPoint(this._camera.target.clone());
            }
        });
    }

private handleRotate(deltaX: number, deltaY: number): void {
    // ✅ Не обрабатываем вращение во время анимации
    if (this.isTransitioning || this.animator.isAnimating) return;
    
    this._camera.alpha += deltaX * 0.005;
    
    if (this.modeManager.is2DMode) {
        this._camera.beta = 0.01;
    } else {
        this._camera.beta += deltaY * 0.005;
        this._camera.beta = Math.max(0.01, Math.min(Math.PI / 2, this._camera.beta));
        // ✅ Сохраняем beta только в 3D режиме и не во время анимации
        if (!this.isTransitioning && !this.animator.isAnimating) {
            this.savedBeta = this._camera.beta;
        }
    }
}

private handlePan(deltaX: number, deltaY: number): void {
    if (this.isTransitioning || this.animator.isAnimating) return;
    
    const moveSpeed = 0.005 * this._camera.radius / 10;
    const right = this._camera.getDirection(new Vector3(-1, 0, 0));
    const up = this._camera.getDirection(new Vector3(0, 1, 0));
    
    const pivot = this.modeManager.getPivotPoint();
    pivot.x += right.x * deltaX * moveSpeed;
    pivot.z += right.z * deltaX * moveSpeed;
    
    if (!this.modeManager.is2DMode) {
        pivot.y += up.y * deltaY * moveSpeed;
    }
    
    this.modeManager.setPivotPoint(pivot);
    this._camera.target = pivot;
}

private handleZoom(_delta: number): void {

}

      public async initialize(customStart?: CameraTransform, customEnd?: CameraTransform): Promise<void> {
        this.logger.info('Initializing camera manager');
        
        const canvas = this.babylonEngine.getCanvas();
        if (canvas) {
            this._camera.attachControl(canvas, true);
        }
        
        const maxDimension = Math.max(this.dimensions.height, this.dimensions.width, this.dimensions.depth);
        const center = this.modeManager.getPivotPoint();
        
        this.modeManager.setDimensions(this.dimensions);
        this.modeManager.setPivotPoint(center);
        
        const start: CameraTransform = customStart ?? {
            alpha: CAMERA.INTRO_ALPHA,
            beta: CAMERA.INTRO_BETA,
            radius: Math.max(30, maxDimension * CAMERA.INTRO_RADIUS_MULTIPLIER),
            target: center.clone()
        };
        
        const end: CameraTransform = customEnd ?? {
            alpha: CAMERA.FINAL_ALPHA,
            beta: CAMERA.FINAL_BETA,
            radius: Math.max(CAMERA.FINAL_RADIUS_MIN, maxDimension * CAMERA.FINAL_RADIUS_MULTIPLIER),
            target: center.clone()
        };
        
        this.initialTransform = {
            alpha: end.alpha,
            beta: end.beta,
            radius: end.radius,
            target: end.target.clone()
        };
        
        this._camera.alpha = start.alpha;
        this._camera.beta = start.beta;
        this._camera.radius = start.radius;
        this._camera.target = start.target;
        
        await this.animator.animateTo(this._camera, end, 2.0);
        
        this.savedBeta = this._camera.beta;
        
        this.isInitialized = true;
        this.eventBus.emit(EventType.SCENE_READY);
        
        this.logger.info(`Camera manager initialized, radius: ${this._camera.radius.toFixed(1)}`);
    }

    public async load(onProgress?: (progress: number) => void): Promise<void> {
        onProgress?.(1);
    }

    public update(_deltaTime: number): void {}

    public async toggleCameraMode(): Promise<void> {
        this.stopAllMovements();
        this.isTransitioning = true;
        
        try {
            if (this.modeManager.is3DMode) {
                await this.switchTo2DMode();
            } else {
                await this.switchTo3DMode();
            }
        } finally {
            this.isTransitioning = false;
        }
    }

    public async switchToMode(mode: CameraMode): Promise<void> {
        if (this.modeManager.mode === mode) return;
        this.stopAllMovements();
        this.isTransitioning = true;
        
        try {
            if (mode === CameraMode.TOP_DOWN) {
                await this.switchTo2DMode();
            } else {
                await this.switchTo3DMode();
            }
        } finally {
            this.isTransitioning = false;
        }
    }

    private async switchTo2DMode(): Promise<void> {
    const pivot = this.modeManager.getPivotPoint();
    const maxDimension = Math.max(this.dimensions.height, this.dimensions.width, this.dimensions.depth);
    
    this.savedBeta = this._camera.beta;
    
    const target: CameraTransform = {
        alpha: this._camera.alpha,
        beta: 0.01,
        radius: maxDimension * 2.5,
        target: pivot
    };
    
    await this.executeTransition(target, CameraMode.TOP_DOWN);
}

private async switchTo3DMode(): Promise<void> {
    const pivot = this.modeManager.getPivotPoint();
    const maxDimension = Math.max(this.dimensions.height, this.dimensions.width, this.dimensions.depth);
    
    // ✅ Используем сохранённую beta, если она не слишком маленькая
    let targetBeta = this.savedBeta;
    if (targetBeta < 0.1) {
        targetBeta = Math.PI / 3.5;  // Значение по умолчанию
    }
    
    const target: CameraTransform = {
        alpha: this._camera.alpha,
        beta: targetBeta,
        radius: maxDimension * 2,
        target: pivot
    };
    
    await this.executeTransition(target, CameraMode.ORBIT);
}
    private async executeTransition(target: CameraTransform, mode: CameraMode): Promise<void> {
    // ✅ Сохраняем текущие ограничения
    
    // ✅ Снимаем все ограничения на время анимации
    this._camera.lowerBetaLimit = 0;
    this._camera.upperBetaLimit = Math.PI / 2;
    this._camera.lowerRadiusLimit = 5;
    this._camera.upperRadiusLimit = 500;
    
    // ✅ Анимируем
    this._camera.target = target.target;
    await this.animator.animateTo(this._camera, target, 0.8);
    
    // ✅ Устанавливаем ограничения для нового режима
    if (mode === CameraMode.TOP_DOWN) {
        this._camera.lowerBetaLimit = 0.005;
        this._camera.upperBetaLimit = 0.05;
        this._camera.lowerRadiusLimit = 15;
        this._camera.upperRadiusLimit = 200;
        // ✅ Фиксируем бета в правильном положении после анимации
        this._camera.beta = 0.01;
    } else {
        this._camera.lowerBetaLimit = CAMERA.MIN_BETA;
        this._camera.upperBetaLimit = CAMERA.MAX_BETA;
        this._camera.lowerRadiusLimit = CAMERA.MIN_RADIUS;
        this._camera.upperRadiusLimit = CAMERA.MAX_RADIUS;
    }
    
    this.modeManager.setMode(mode);
    
    this.logger.info(`Switched to ${mode === CameraMode.TOP_DOWN ? '2D' : '3D'} mode`);
    this.eventBus.emit(EventType.CAMERA_MODE_CHANGED, { mode });
}

    // features/camera/CameraManager.ts

public async focusOnPoint(point: Vector3, distance?: number, duration?: number): Promise<void> {
    if (this.isTransitioning || this.animator.isAnimating) return;
    
    this.logger.debug(`Focusing on point: ${point.toString()}`);
    this.isTransitioning = true;
    
    try {
        const targetDuration = duration || 1.0;
        const targetDistance = distance || 8;
        
        // Сохраняем текущие значения
        const currentAlpha = this._camera.alpha;
        const currentBeta = this._camera.beta;
        const currentRadius = this._camera.radius;
        const currentTarget = this._camera.target.clone();
        
        // Этап 1: Отдаляемся, чтобы увидеть контекст
        const farRadius = currentRadius * 1.5;
        await this.animator.animateTo(this._camera, {
            alpha: currentAlpha,
            beta: currentBeta,
            radius: farRadius,
            target: currentTarget
        }, targetDuration * 0.3);
        
        // Этап 2: Перемещаемся к точке
        await this.animator.animateTo(this._camera, {
            alpha: currentAlpha,
            beta: currentBeta,
            radius: farRadius,
            target: point.clone()
        }, targetDuration * 0.4);
        
        // Этап 3: Приближаемся
        await this.animator.animateTo(this._camera, {
            alpha: currentAlpha,
            beta: currentBeta,
            radius: targetDistance,
            target: point.clone()
        }, targetDuration * 0.3);
        
        this.modeManager.setPivotPoint(point);
        
        this.eventBus.emit(EventType.CAMERA_FOCUSED, { point });
        
    } finally {
        this.isTransitioning = false;
    }
}

    public async focusOnRoute(positions: Vector3[], duration?: number): Promise<void> {
        if (positions.length === 0 || this.isTransitioning || this.animator.isAnimating) return;
        
        const center = positions.reduce((acc, pos) => acc.add(pos), Vector3.Zero()).scale(1 / positions.length);
        let maxDistance = 0;
        positions.forEach(pos => {
            const dist = Vector3.Distance(center, pos);
            maxDistance = Math.max(maxDistance, dist);
        });
        
        const optimalDistance = Math.max(20, maxDistance * 2);
        await this.focusOnPoint(center, optimalDistance, duration);
    }

    public async resetCamera(): Promise<void> {
        if (this.isTransitioning || this.animator.isAnimating) return;
        
        this.isTransitioning = true;
        try {
            if (!this.initialTransform) {
                this.logger.warn('No initial transform saved, using default');
                const maxDimension = Math.max(this.dimensions.height, this.dimensions.width, this.dimensions.depth);
                this.initialTransform = {
                    alpha: CAMERA.FINAL_ALPHA,
                    beta: CAMERA.FINAL_BETA,
                    radius: Math.max(CAMERA.FINAL_RADIUS_MIN, maxDimension * CAMERA.FINAL_RADIUS_MULTIPLIER),
                    target: this.modeManager.getPivotPoint()
                };
            }
            
            const targetTransform: CameraTransform = {
                alpha: this.initialTransform.alpha,
                beta: this.initialTransform.beta,
                radius: this.initialTransform.radius,
                target: this.modeManager.getPivotPoint()
            };
            
            await this.animator.animateTo(this._camera, targetTransform, 0.8);
            
            this.savedBeta = this._camera.beta;
            
            if (this.modeManager.is2DMode) {
                this.modeManager.setMode(CameraMode.ORBIT);
                this._camera.lowerBetaLimit = CAMERA.MIN_BETA;
                this._camera.upperBetaLimit = CAMERA.MAX_BETA;
                this._camera.lowerRadiusLimit = CAMERA.MIN_RADIUS;
                this._camera.upperRadiusLimit = CAMERA.MAX_RADIUS;
            }
            
            this.logger.info(`Camera reset to initial position, radius: ${this._camera.radius.toFixed(1)}`);
            
        } finally {
            this.isTransitioning = false;
        }
    }

    private stopAllMovements(): void {
        if (this.animator.isAnimating) {
            this.animator.stopAnimation();
        }
    }

    public canInteractWithUI(): boolean {
        return !this.isTransitioning && !this.animator.isAnimating;
    }

    public setDimensions(dimensions: BuildingDimensions): void {
        this.dimensions = dimensions;
        this.modeManager.setDimensions(dimensions);
    }

    public setTargetPosition(position: Vector3): void {
        this.modeManager.setPivotPoint(position);
        if (this.isInitialized && this.modeManager.is3DMode && !this.isTransitioning) {
            this._camera.target = position;
        }
    }

    public dispose(): void {
        this.stopAllMovements();
        this.animator.dispose();
        this.modeManager.dispose();
        this.inputHandler.dispose();
        this._camera.dispose();
    }

    public get camera(): ArcRotateCamera {
        return this._camera;
    }

    public get isAnimating(): boolean {
        return this.isTransitioning || this.animator.isAnimating;
    }

    public get cameraMode(): CameraMode {
        return this.modeManager.mode;
    }

    public get targetPosition(): Vector3 {
        return this.modeManager.getPivotPoint();
    }
}