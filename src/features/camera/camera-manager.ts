import { Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { CameraMode, CameraTransform, BuildingDimensions } from "@shared/types";
import { CAMERA } from "@shared/constants";
import { EventType } from "@core/events/event-types";
import type { ICameraAnimator, ICameraInputHandler, ICameraManager, ICameraModeManager } from "@shared/interfaces";

/**
 * Главный менеджер камеры
 * Координирует ввод, анимации и переключение режимов
 */
export class CameraManager implements ICameraManager {
    private scene!: Scene;
    private _camera!: ArcRotateCamera;
    private eventBus: EventBus;

    private readonly animator: ICameraAnimator;
    private readonly modeManager: ICameraModeManager;
    private readonly inputHandler: ICameraInputHandler;

    private dimensions: BuildingDimensions = { height: 30, width: 30, depth: 30 };
    private isTransitioning = false;
    private savedBeta = Math.PI / 3.5;

    // Начальная позиция камеры (для сброса)
    private initialTransform: CameraTransform | null = null;
    private initialCameraPosition = Vector3.Zero();
    private initialCameraTarget = Vector3.Zero();

    constructor(
        _logger: Logger,
        eventBus: EventBus,
        animator: ICameraAnimator,
        modeManager: ICameraModeManager,
        inputHandler: ICameraInputHandler
    ) {
        this.eventBus = eventBus;
        this.animator = animator;
        this.modeManager = modeManager;
        this.inputHandler = inputHandler;

        this.setupInputCallbacks();
    }

    public setScene(scene: Scene): void {
        this.scene = scene;
        this._camera = this.initCamera();
        this.animator.setScene(scene);
        this.setupTargetSync();

        const canvas = scene.getEngine().getRenderingCanvas();
        if (canvas) {
            this.inputHandler.attachToCanvas(canvas);
        }
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

        camera.inputs.clear();
        camera.attachControl = () => { }; // Отключаем стандартное управление

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
        if (this.isTransitioning || this.animator.isAnimating) return;

        this._camera.alpha += deltaX * CAMERA.ROTATION_SPEED;
        this._camera.beta += deltaY * CAMERA.ROTATION_SPEED;
        this._camera.beta = Math.max(0.01, Math.min(Math.PI / 2, this._camera.beta));

        if (!this.isTransitioning && !this.animator.isAnimating) {
            this.savedBeta = this._camera.beta;
        }
    }

    private handlePan(deltaX: number, deltaY: number): void {
        if (this.isTransitioning || this.animator.isAnimating) return;

        const moveSpeed = CAMERA.PAN_SPEED * this._camera.radius / CAMERA.PAN_SPEED_MULTIPLIER;
        const camera = this._camera;
        const right = camera.getDirection(new Vector3(1, 0, 0));
        const up = camera.getDirection(new Vector3(0, 1, 0));
        const target = camera.target;

        target.x -= right.x * deltaX * moveSpeed;
        target.y -= right.y * deltaX * moveSpeed;
        target.z -= right.z * deltaX * moveSpeed;
        target.x += up.x * deltaY * moveSpeed;
        target.y += up.y * deltaY * moveSpeed;
        target.z += up.z * deltaY * moveSpeed;

        camera.target = target;
        this.modeManager.setPivotPoint(target);
    }

    private handleZoom(delta: number): void {
        if (this.isTransitioning || this.animator.isAnimating) return;

        this._camera.radius += delta * CAMERA.ZOOM_SPEED;
        this._camera.radius = Math.max(CAMERA.MIN_RADIUS, Math.min(CAMERA.MAX_RADIUS, this._camera.radius));
    }

    /**
     * Начальная анимация камеры (интро)
     */
    public async initialize(customStart?: CameraTransform, customEnd?: CameraTransform): Promise<void> {
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

        this._camera.alpha = start.alpha;
        this._camera.beta = start.beta;
        this._camera.radius = start.radius;
        this._camera.target = start.target;

        await this.animator.animateTo(this._camera, end, 2.0);
        this.savedBeta = this._camera.beta;

        this.initialCameraPosition = this._camera.position.clone();
        this.initialCameraTarget = this._camera.target.clone();
        this.initialTransform = {
            alpha: this._camera.alpha,
            beta: this._camera.beta,
            radius: this._camera.radius,
            target: this._camera.target.clone()
        };

        this.eventBus.emit(EventType.SCENE_READY);
    }

    public async load(onProgress?: (progress: number) => void): Promise<void> {
        onProgress?.(1);
    }

    public update(_deltaTime: number): void { }

    /**
     * Переключить режим камеры (3D ↔ 2D)
     */
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

        await this.executeTransition({
            alpha: this._camera.alpha,
            beta: 0.01,
            radius: maxDimension * 2.5,
            target: pivot
        }, CameraMode.TOP_DOWN);
    }

    private async switchTo3DMode(): Promise<void> {
        const pivot = this.modeManager.getPivotPoint();
        const maxDimension = Math.max(this.dimensions.height, this.dimensions.width, this.dimensions.depth);
        const targetBeta = this.savedBeta < 0.1 ? Math.PI / 3.5 : this.savedBeta;

        await this.executeTransition({
            alpha: this._camera.alpha,
            beta: targetBeta,
            radius: maxDimension * 2,
            target: pivot
        }, CameraMode.ORBIT);
    }

    private async executeTransition(target: CameraTransform, mode: CameraMode): Promise<void> {
        // Снимаем ограничения на время анимации
        this._camera.lowerBetaLimit = 0;
        this._camera.upperBetaLimit = Math.PI / 2;
        this._camera.lowerRadiusLimit = 5;
        this._camera.upperRadiusLimit = 500;

        this._camera.target = target.target;
        await this.animator.animateTo(this._camera, target, 0.8);

        // Устанавливаем ограничения для нового режима
        if (mode === CameraMode.TOP_DOWN) {
            this._camera.lowerBetaLimit = 0.005;
            this._camera.upperBetaLimit = 0.05;
            this._camera.lowerRadiusLimit = 15;
            this._camera.upperRadiusLimit = 200;
            this._camera.beta = 0.01;
        } else {
            this._camera.lowerBetaLimit = CAMERA.MIN_BETA;
            this._camera.upperBetaLimit = CAMERA.MAX_BETA;
            this._camera.lowerRadiusLimit = CAMERA.MIN_RADIUS;
            this._camera.upperRadiusLimit = CAMERA.MAX_RADIUS;
        }

        this.modeManager.setMode(mode);
        this.eventBus.emit(EventType.CAMERA_MODE_CHANGED, { mode });
    }

    /**
     * Сфокусировать камеру на точке (с отдалением-приближением)
     */
    public async focusOnPoint(point: Vector3, distance?: number, duration?: number): Promise<void> {
        if (this.isTransitioning || this.animator.isAnimating) return;

        this.isTransitioning = true;
        try {
            const targetDuration = duration || 1.0;
            const targetDistance = distance || 8;

            const currentAlpha = this._camera.alpha;
            const currentBeta = this._camera.beta;
            const currentRadius = this._camera.radius;
            const currentTarget = this._camera.target.clone();

            // Этап 1: Отдаляемся
            const farRadius = currentRadius * 1.5;
            await this.animator.animateTo(this._camera, {
                alpha: currentAlpha, beta: currentBeta,
                radius: farRadius, target: currentTarget
            }, targetDuration * 0.3);

            // Этап 2: Перемещаем target
            await this.animator.animateTo(this._camera, {
                alpha: currentAlpha, beta: currentBeta,
                radius: farRadius, target: point.clone()
            }, targetDuration * 0.4);

            // Этап 3: Приближаемся
            await this.animator.animateTo(this._camera, {
                alpha: currentAlpha, beta: currentBeta,
                radius: targetDistance, target: point.clone()
            }, targetDuration * 0.3);

            this.modeManager.setPivotPoint(point);
            this.eventBus.emit(EventType.CAMERA_FOCUSED, { point });
        } finally {
            this.isTransitioning = false;
        }
    }

    /**
     * Сфокусировать камеру на маршруте
     */
    public async focusOnRoute(positions: Vector3[], duration?: number): Promise<void> {
        if (positions.length === 0 || this.isTransitioning || this.animator.isAnimating) return;

        const center = positions.reduce((acc, pos) => acc.add(pos), Vector3.Zero()).scale(1 / positions.length);
        let maxDistance = 0;
        positions.forEach(pos => { maxDistance = Math.max(maxDistance, Vector3.Distance(center, pos)); });

        await this.focusOnPoint(center, Math.max(20, maxDistance * 2), duration);
    }

    /**
     * Сбросить камеру к начальной позиции
     */
    public async resetCamera(): Promise<void> {
        if (this.isTransitioning || this.animator.isAnimating || !this.initialTransform) return;

        this.isTransitioning = true;
        try {
            if (this.modeManager.is2DMode) {
                await this.switchTo3DMode();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const startPosition = this._camera.position.clone();
            const startTarget = this._camera.target.clone();
            const endPosition = this.initialCameraPosition;
            const endTarget = this.initialCameraTarget;
            const duration = CAMERA.RESET_DURATION;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = (currentTime - startTime) / 1000;
                const t = Math.min(1, elapsed / duration);

                this._camera.position = new Vector3(
                    startPosition.x + (endPosition.x - startPosition.x) * t,
                    startPosition.y + (endPosition.y - startPosition.y) * t,
                    startPosition.z + (endPosition.z - startPosition.z) * t
                );
                this._camera.target = new Vector3(
                    startTarget.x + (endTarget.x - startTarget.x) * t,
                    startTarget.y + (endTarget.y - startTarget.y) * t,
                    startTarget.z + (endTarget.z - startTarget.z) * t
                );

                this.modeManager.setPivotPoint(this._camera.target);

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this._camera.alpha = this.initialTransform!.alpha;
                    this._camera.beta = this.initialTransform!.beta;
                    this._camera.radius = this.initialTransform!.radius;
                    this.savedBeta = this._camera.beta;
                    this.isTransitioning = false;
                    this.eventBus.emit(EventType.CAMERA_RESET, { mode: this.cameraMode });
                }
            };

            requestAnimationFrame(animate);
        } catch {
            this.isTransitioning = false;
        }
    }

    private stopAllMovements(): void {
        if (this.animator.isAnimating) this.animator.stopAnimation();
    }

    public setDimensions(dimensions: BuildingDimensions): void {
        this.dimensions = dimensions;
        this.modeManager.setDimensions(dimensions);
    }

    public setTargetPosition(position: Vector3): void {
        this.modeManager.setPivotPoint(position);
        if (this.modeManager.is3DMode && !this.isTransitioning) {
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

    // Геттеры
    public get camera(): ArcRotateCamera { return this._camera; }
    public get isAnimating(): boolean { return this.isTransitioning || this.animator.isAnimating; }
    public get cameraMode(): CameraMode { return this.modeManager.mode; }
    public get targetPosition(): Vector3 { return this.modeManager.getPivotPoint(); }
}
