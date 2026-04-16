import { Scene, ArcRotateCamera, UniversalCamera, Vector3 } from "@babylonjs/core";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { CameraMode, BuildingDimensions, CameraTransform } from "@shared/types";
import { CAMERA, FLOOR_CONFIG, FLOOR_EXPAND_CONFIG } from "@shared/constants";
import { EventType } from "@core/events/event-types";
import type { ICameraAnimator, ICameraInputHandler, ICameraManager, ICameraModeManager } from "@shared/interfaces";

/**
 * Главный менеджер камеры
 * Free Flight по умолчанию
 */
export class CameraManager implements ICameraManager {
    private scene!: Scene;
    private _orbitCamera!: ArcRotateCamera;
    private _flightCamera!: UniversalCamera;
    private _activeCamera!: ArcRotateCamera | UniversalCamera;

    private eventBus: EventBus;
    private logger: Logger;
    private readonly animator: ICameraAnimator;
    private readonly modeManager: ICameraModeManager;
    private readonly inputHandler: ICameraInputHandler;

    private dimensions: BuildingDimensions = { height: 30, width: 30, depth: 30 };
    private isTransitioning = false;
    private unsubscribeFns: Array<() => void> = [];
    private contextPivotY: number | null = null;

    private initialFlightPosition: Vector3 = CAMERA.FREE_FLIGHT.DEFAULT_POSITION.clone();
    private initialFlightTarget: Vector3 = CAMERA.FREE_FLIGHT.DEFAULT_TARGET.clone();

    constructor(
        logger: Logger,
        eventBus: EventBus,
        animator: ICameraAnimator,
        modeManager: ICameraModeManager,
        inputHandler: ICameraInputHandler
    ) {
        this.logger = logger;
        this.eventBus = eventBus;
        this.animator = animator;
        this.modeManager = modeManager;
        this.inputHandler = inputHandler;
    }

    public setScene(scene: Scene): void {
        this.scene = scene;

        this._orbitCamera = this.initOrbitCamera();
        this._flightCamera = this.initFlightCamera();
        this._activeCamera = this._flightCamera; // Free Flight по умолчанию
        this.scene.activeCamera = this._flightCamera;

        this.animator.setScene(scene);
        this.inputHandler.setCameraManager(this);
        this.inputHandler.setOrbitCamera(this._orbitCamera);
        this.inputHandler.setFlightCamera(this._flightCamera);

        const canvas = scene.getEngine().getRenderingCanvas();
        if (canvas) {
            this.inputHandler.attachToCanvas(canvas);
        }

        this.setActiveMode(CameraMode.FREE_FLIGHT);
        this.setupEventSubscriptions();
    }

    private initOrbitCamera(): ArcRotateCamera {
        const camera = new ArcRotateCamera(
            "orbitCamera",
            CAMERA.ORBIT.DEFAULT_ALPHA,
            CAMERA.ORBIT.DEFAULT_BETA,
            CAMERA.ORBIT.DEFAULT_RADIUS,
            Vector3.Zero(),
            this.scene
        );

        camera.maxZ = 2000;
        camera.upperRadiusLimit = CAMERA.ORBIT.MAX_RADIUS;
        camera.lowerRadiusLimit = CAMERA.ORBIT.MIN_RADIUS;
        camera.lowerBetaLimit = CAMERA.ORBIT.MIN_BETA;
        camera.upperBetaLimit = CAMERA.ORBIT.MAX_BETA;
        camera.panningSensibility = 0; // Отключаем панорамирование
        camera.wheelPrecision = CAMERA.WHEEL_PRECISION;
        camera.pinchPrecision = CAMERA.PINCH_PRECISION;

        camera.inputs.clear();
        camera.attachControl = () => { };

        return camera;
    }

    private initFlightCamera(): UniversalCamera {
        const camera = new UniversalCamera(
            "flightCamera",
            this.initialFlightPosition.clone(),
            this.scene
        );

        camera.maxZ = 2000;
        camera.speed = 0;
        camera.angularSensibility = 0;
        camera.inputs.clear();
        camera.attachControl = () => { };
        camera.setTarget(this.initialFlightTarget.clone());

        return camera;
    }

    private setupEventSubscriptions(): void {
        this.unsubscribeFns.forEach(unsubscribe => unsubscribe());
        this.unsubscribeFns = [];

        this.unsubscribeFns.push(
            this.eventBus.on(EventType.FLOOR_CHANGED, (event) => {
                const floor = event.data?.floor;
                const mode = event.data?.mode;
                if (floor === undefined) return;

                this.modeManager.setCurrentFloor(floor);
                if (mode === 'single' || mode === 'all') {
                    this.modeManager.setViewMode(mode);
                }
                if (typeof event.data?.pivotY === 'number') {
                    this.contextPivotY = event.data.pivotY;
                }
                this.modeManager.setPivotPoint(this.getPivotForCurrentContext());

                if (this.modeManager.isOrbitMode && !this.isAnimating) {
                    void this.animateOrbitToCurrentContext();
                } else if (this.modeManager.is2DMode && !this.isAnimating) {
                    void this.animateTopDownToCurrentContext();
                }
            }),
            this.eventBus.on(EventType.VIEW_MODE_CHANGED, (event) => {
                const mode = event.data?.mode;
                if (mode !== 'single' && mode !== 'all') return;

                this.modeManager.setViewMode(mode);
                if (mode === 'all') {
                    this.modeManager.setCurrentFloor('all');
                }
                if (typeof event.data?.pivotY === 'number') {
                    this.contextPivotY = event.data.pivotY;
                }
                this.modeManager.setPivotPoint(this.getPivotForCurrentContext());
            }),
            this.eventBus.on(EventType.FLOOR_EXPAND_CHANGED, (event) => {
                this.modeManager.setFloorExpanded(Boolean(event.data?.expanded));
                if (typeof event.data?.pivotY === 'number') {
                    this.contextPivotY = event.data.pivotY;
                }
                this.modeManager.setPivotPoint(this.getPivotForCurrentContext());

                if (this.modeManager.isOrbitMode && !this.isAnimating) {
                    void this.animateOrbitToCurrentContext();
                } else if (this.modeManager.is2DMode && !this.isAnimating) {
                    void this.animateTopDownToCurrentContext();
                }
            })
        );
    }

    private setActiveMode(mode: CameraMode): void {
        this.modeManager.setMode(mode);
        this.inputHandler.setMode(mode);
    }

    private getOverviewDistance(multiplier: number): number {
        const maxDimension = Math.max(this.dimensions.height, this.dimensions.width, this.dimensions.depth);
        return Math.max(30, maxDimension * multiplier);
    }

    private buildOrbitStateFromPosition(position: Vector3, pivot: Vector3): { alpha: number; beta: number; radius: number } {
        let direction = position.subtract(pivot);
        let radius = direction.length();

        if (radius < 0.001) {
            radius = CAMERA.ORBIT.DEFAULT_RADIUS;
            direction = new Vector3(0, radius * 0.5, radius);
        }

        const safeRadius = Math.max(CAMERA.ORBIT.MIN_RADIUS, Math.min(CAMERA.ORBIT.MAX_RADIUS, radius));
        const beta = Math.acos(Math.max(-1, Math.min(1, direction.y / safeRadius)));
        const alpha = Math.atan2(direction.z, direction.x);

        return {
            alpha,
            beta: Math.max(CAMERA.ORBIT.MIN_BETA, Math.min(CAMERA.ORBIT.MAX_BETA, beta)),
            radius: safeRadius
        };
    }

    private applyOrbitState(position: Vector3, pivot: Vector3): void {
        const orbitState = this.buildOrbitStateFromPosition(position, pivot);
        this._orbitCamera.alpha = orbitState.alpha;
        this._orbitCamera.beta = orbitState.beta;
        this._orbitCamera.radius = orbitState.radius;
        this._orbitCamera.target = pivot.clone();
    }

    private getFloorCenterY(floorLevel: number, center: Vector3): number {
        const baseY = center.y - (this.dimensions.height / 2);
        return baseY + ((floorLevel - 0.5) * this.modeManager.floorHeight);
    }

    private getExpandedFloorOffset(floorLevel: number): number {
        return this.modeManager.isFloorExpanded
            ? Math.max(0, floorLevel - 1) * FLOOR_EXPAND_CONFIG.FLOOR_OFFSET
            : 0;
    }

    private getExpandedBuildingOffset(): number {
        if (!this.modeManager.isFloorExpanded) return 0;

        const estimatedFloorCount = Math.max(
            1,
            Math.round(this.dimensions.height / Math.max(this.modeManager.floorHeight, FLOOR_CONFIG.FLOOR_HEIGHT))
        );

        return ((estimatedFloorCount - 1) * FLOOR_EXPAND_CONFIG.FLOOR_OFFSET) / 2;
    }

    private getTopDownUpVector(): Vector3 {
        const currentForward = this._activeCamera.getDirection(Vector3.Forward());
        const horizontalForward = new Vector3(currentForward.x, 0, currentForward.z);

        if (horizontalForward.lengthSquared() > 0.0001) {
            return horizontalForward.normalize();
        }

        const currentUp = new Vector3(this._flightCamera.upVector.x, 0, this._flightCamera.upVector.z);
        if (currentUp.lengthSquared() > 0.0001) {
            return currentUp.normalize();
        }

        return new Vector3(0, 0, -1);
    }

    public get camera(): ArcRotateCamera {
        return this._orbitCamera;
    }

    public get flightCamera(): UniversalCamera {
        return this._flightCamera;
    }

    public get activeCamera(): ArcRotateCamera | UniversalCamera {
        return this._activeCamera;
    }

    public getActiveCamera(): ArcRotateCamera | UniversalCamera {
        return this._activeCamera;
    }

    public async initialize(customStart?: CameraTransform, _customEnd?: CameraTransform): Promise<void> {
        const center = this.getBuildingCenter();
        const initialPivot = this.getPivotForCurrentContext();
        const targetDistance = this.getOverviewDistance(1.35);
        const verticalOffset = Math.max(8, this.dimensions.height * 0.22);
        const endPosition = new Vector3(
            center.x + targetDistance * 0.85,
            center.y + verticalOffset,
            center.z + targetDistance * 0.55
        );
        const introPosition = new Vector3(
            center.x + this.getOverviewDistance(2.2),
            center.y + Math.max(20, this.dimensions.height * 0.95),
            center.z + this.getOverviewDistance(2.05)
        );

        if (customStart?.position) {
            this._flightCamera.position = customStart.position.clone();
            this._flightCamera.setTarget(customStart.target.clone());
        } else {
            this._flightCamera.position = introPosition.clone();
            this._flightCamera.setTarget(initialPivot.clone());
        }

        this._flightCamera.rotation = Vector3.Zero();
        this._flightCamera.upVector = Vector3.Up();
        this.applyOrbitState(this._flightCamera.position, initialPivot);

        this.initialFlightPosition = this._flightCamera.position.clone();
        this.initialFlightTarget = initialPivot.clone();
        this.modeManager.setPivotPoint(initialPivot);
        this.modeManager.setBuildingCenter(center);

        if (!customStart?.position) {
            await this.animator.animatePosition(
                this._flightCamera,
                endPosition,
                initialPivot.clone(),
                1.1
            );
        }

        this.initialFlightPosition = this._flightCamera.position.clone();
        this.initialFlightTarget = this._flightCamera.getTarget().clone();

        this.eventBus.emit(EventType.SCENE_READY);
        this.logger.info('Camera initialized in Free Flight mode');
    }

    public async load(onProgress?: (progress: number) => void): Promise<void> {
        onProgress?.(1);
    }

    public update(_deltaTime: number): void {
        // Обновление состояния при необходимости
    }

    public async toggleCameraMode(): Promise<void> {
        if (this.isTransitioning || this.animator.isAnimating) return;
        this.stopAllMovements();
        this.isTransitioning = true;

        try {
            if (this.modeManager.is2DMode) {
                await this.switchTo3DMode();
            } else {
                await this.switchTo2DMode();
            }
        } finally {
            this.isTransitioning = false;
        }
    }

    public async switchToMode(mode: CameraMode): Promise<void> {
        if (this.modeManager.mode === mode || this.isTransitioning || this.animator.isAnimating) return;
        this.stopAllMovements();
        this.isTransitioning = true;

        try {
            if (mode === CameraMode.TOP_DOWN) {
                await this.switchTo2DMode();
            } else if (mode === CameraMode.ORBIT) {
                await this.switchToOrbitMode();
            } else if (mode === CameraMode.FREE_FLIGHT) {
                await this.switchToFreeFlightMode();
            }
        } finally {
            this.isTransitioning = false;
        }
    }

    public async toggleControlMode(): Promise<void> {
        if (this.isTransitioning || this.animator.isAnimating) return;

        if (this.modeManager.is2DMode) {
            await this.switchToOrbitMode();
        } else if (this.modeManager.isFreeFlightMode) {
            await this.switchToOrbitMode();
        } else if (this.modeManager.isOrbitMode) {
            await this.switchToFreeFlightMode();
        }
    }

    private async switchToOrbitMode(): Promise<void> {
        if (this.modeManager.is2DMode) {
            await this.switchTo3DMode();
        }

        const pivot = this.getPivotForCurrentContext();
        const currentPos = this._flightCamera.position.clone();
        const currentTarget = this._flightCamera.getTarget().clone();

        await this.animateFlightTransition(currentPos, currentTarget, currentPos, pivot, 0.45);

        this.applyOrbitState(this._flightCamera.position, pivot);
        this.scene.activeCamera = this._orbitCamera;
        this._activeCamera = this._orbitCamera;
        this.modeManager.setPivotPoint(pivot);
        this.setActiveMode(CameraMode.ORBIT);

        this.logger.info('Switched to Orbit mode');
        this.eventBus.emit(EventType.CAMERA_MODE_CHANGED, { mode: CameraMode.ORBIT });
    }

    private async switchToFreeFlightMode(): Promise<void> {
        const { currentTarget } = this.syncFlightCameraFromActiveCamera();

        this.scene.activeCamera = this._flightCamera;
        this._activeCamera = this._flightCamera;
        this._flightCamera.upVector = Vector3.Up();
        this.modeManager.setPivotPoint(currentTarget);
        this.setActiveMode(CameraMode.FREE_FLIGHT);

        this.logger.info('Switched to Free Flight mode');
        this.eventBus.emit(EventType.CAMERA_MODE_CHANGED, { mode: CameraMode.FREE_FLIGHT });
    }

    private async switchTo2DMode(): Promise<void> {
        if (this.modeManager.isOrbitMode) {
            await this.switchToFreeFlightMode();
        }

        const pivot = this.getPivotForCurrentContext();
        const targetRadius = this.getOverviewDistance(2.3);
        const startPos = this._flightCamera.position.clone();
        const startTarget = this._flightCamera.getTarget().clone();
        const endPos = new Vector3(pivot.x, pivot.y + targetRadius, pivot.z);
        const endTarget = pivot.clone();
        const startUp = this._flightCamera.upVector.clone();
        const endUp = this.getTopDownUpVector();

        await this.animateFlightTransition(startPos, startTarget, endPos, endTarget, 0.8, startUp, endUp);

        this.modeManager.setPivotPoint(pivot);
        this.setActiveMode(CameraMode.TOP_DOWN);
        this.eventBus.emit(EventType.CAMERA_MODE_CHANGED, { mode: CameraMode.TOP_DOWN });
    }

    private async switchTo3DMode(): Promise<void> {
        const pivot = this.getPivotForCurrentContext();
        const targetRadius = this.getOverviewDistance(1.45);

        const startPos = this._flightCamera.position.clone();
        const startTarget = this._flightCamera.getTarget().clone();
        const endPos = new Vector3(
            pivot.x,
            pivot.y + Math.max(6, this.dimensions.height * 0.15),
            pivot.z + targetRadius
        );
        const endTarget = pivot.clone();
        const startUp = this._flightCamera.upVector.clone();
        const endUp = Vector3.Up();

        await this.animateFlightTransition(startPos, startTarget, endPos, endTarget, 0.8, startUp, endUp);

        this.modeManager.setPivotPoint(pivot);
        this.setActiveMode(CameraMode.FREE_FLIGHT);
        this.eventBus.emit(EventType.CAMERA_MODE_CHANGED, { mode: CameraMode.FREE_FLIGHT });
    }

    private syncFlightCameraFromActiveCamera(): { currentPos: Vector3; currentTarget: Vector3 } {
        const currentPos = this._activeCamera.position.clone();
        const currentTarget = this._activeCamera.getTarget().clone();

        this._flightCamera.position = currentPos.clone();
        this._flightCamera.upVector = ('upVector' in this._activeCamera && this._activeCamera.upVector)
            ? this._activeCamera.upVector.clone()
            : Vector3.Up();
        this._flightCamera.setTarget(currentTarget.clone());

        return { currentPos, currentTarget };
    }

    private async animateOrbitToCurrentContext(duration: number = 0.6): Promise<void> {
        if (!this.modeManager.isOrbitMode || this.isTransitioning || this.animator.isAnimating) return;

        const pivot = this.getPivotForCurrentContext();
        this.modeManager.setPivotPoint(pivot);

        await this.animator.animateCamera(this._orbitCamera, {
            target: pivot
        }, duration);
    }

    private async animateTopDownToCurrentContext(duration: number = 0.6): Promise<void> {
        if (!this.modeManager.is2DMode || this.isTransitioning || this.animator.isAnimating) return;

        const pivot = this.getPivotForCurrentContext();
        const targetRadius = this.getOverviewDistance(2.3);
        const currentPos = this._flightCamera.position.clone();
        const currentTarget = this._flightCamera.getTarget().clone();
        const endPos = new Vector3(pivot.x, pivot.y + targetRadius, pivot.z);
        const currentUp = this._flightCamera.upVector.clone();

        await this.animateFlightTransition(currentPos, currentTarget, endPos, pivot.clone(), duration, currentUp, currentUp);
    }

    private async animateFlightTransition(
        startPos: Vector3,
        startTarget: Vector3,
        endPos: Vector3,
        endTarget: Vector3,
        duration: number = 0.8,
        startUp?: Vector3,
        endUp?: Vector3
    ): Promise<void> {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const durationMs = duration * 1000;
            const fromUp = (startUp || this._flightCamera.upVector).clone();
            const toUp = (endUp || fromUp).clone();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const t = Math.min(1, elapsed / durationMs);
                const easeT = 1 - Math.pow(1 - t, 3); // easeOutCubic

                this._flightCamera.position = Vector3.Lerp(startPos, endPos, easeT);
                const interpolatedUp = Vector3.Lerp(fromUp, toUp, easeT);
                if (interpolatedUp.lengthSquared() > 0.0001) {
                    this._flightCamera.upVector = interpolatedUp.normalize();
                }
                this._flightCamera.setTarget(Vector3.Lerp(startTarget, endTarget, easeT));

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this._flightCamera.upVector = toUp.normalize();
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    public async focusOnPoint(point: Vector3, distance?: number, duration?: number): Promise<void> {
        if (this.isTransitioning || this.animator.isAnimating) return;

        const animDuration = duration || 0.8;
        const targetDistance = distance || 15;

        if (this.modeManager.isFreeFlightMode) {
            const direction = point.subtract(this._flightCamera.position).normalize();
            const newPos = point.subtract(direction.scale(targetDistance));

            await this.animator.animatePosition(this._flightCamera, newPos, point, animDuration);
        } else if (this.modeManager.isOrbitMode) {
            await this.animator.animateCamera(this._orbitCamera, {
                radius: targetDistance,
                target: point
            }, animDuration);
        }

        this.modeManager.setPivotPoint(point);
        this.eventBus.emit(EventType.CAMERA_FOCUSED, { point });
    }

    public async focusOnRoute(positions: Vector3[], duration?: number): Promise<void> {
        if (positions.length === 0 || this.isTransitioning || this.animator.isAnimating) return;

        const center = positions.reduce((acc, pos) => acc.add(pos), Vector3.Zero()).scale(1 / positions.length);
        let maxDistance = 0;
        positions.forEach(pos => { maxDistance = Math.max(maxDistance, Vector3.Distance(center, pos)); });

        await this.focusOnPoint(center, Math.max(20, maxDistance * 1.5), duration);
    }

    public async focusOnFloor(floorLevel: number, buildingCenter: Vector3, floorHeight: number): Promise<void> {
        if (this.isTransitioning || this.animator.isAnimating) return;

        this.modeManager.setCurrentContext(floorLevel, buildingCenter, floorHeight);
        const focusPoint = this.getPivotForCurrentContext();

        await this.focusOnPoint(focusPoint, 12, 0.6);
    }

    public getPivotForCurrentContext(): Vector3 {
        const center = this.getBuildingCenter();
        const resolvedY = this.contextPivotY;

        if (typeof resolvedY === 'number') {
            return new Vector3(center.x, resolvedY, center.z);
        }

        if (this.modeManager.currentFloor >= 0) {
            const floorY = this.getFloorCenterY(this.modeManager.currentFloor, center)
                + this.getExpandedFloorOffset(this.modeManager.currentFloor);
            return new Vector3(center.x, floorY, center.z);
        }

        if (this.modeManager.viewMode === 'all' && this.modeManager.isFloorExpanded) {
            return new Vector3(center.x, center.y + this.getExpandedBuildingOffset(), center.z);
        }

        return center;
    }

    private getBuildingCenter(): Vector3 {
        const center = this.modeManager.buildingCenter;
        if (center.lengthSquared() > 0) {
            return center.clone();
        }

        return new Vector3(0, this.dimensions.height / 2, 0);
    }

    public async resetCamera(): Promise<void> {
        if (this.isTransitioning || this.animator.isAnimating) return;

        this.isTransitioning = true;
        try {
            // Всегда переключаемся в Free Flight 3D
            if (!this.modeManager.isFreeFlightMode) {
                this.syncFlightCameraFromActiveCamera();
                this.scene.activeCamera = this._flightCamera;
                this._activeCamera = this._flightCamera;
                this.setActiveMode(CameraMode.FREE_FLIGHT);
            }

            // Анимируем возврат на начальную позицию
            await this.animateFlightTransition(
                this._flightCamera.position.clone(),
                this._flightCamera.getTarget().clone(),
                this.initialFlightPosition,
                this.initialFlightTarget,
                CAMERA.RESET_DURATION,
                this._flightCamera.upVector.clone(),
                Vector3.Up()
            );

            this._flightCamera.upVector = Vector3.Up();
            this._flightCamera.setTarget(this.initialFlightTarget.clone());
            this.modeManager.setPivotPoint(this.initialFlightTarget);
            this.eventBus.emit(EventType.CAMERA_RESET, { mode: this.cameraMode });
        } finally {
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
        this.modeManager.setBuildingCenter(position);
        this.modeManager.setPivotPoint(position);
        if (this.modeManager.isOrbitMode && !this.isTransitioning) {
            this._orbitCamera.target = position.clone();
        }
    }

    public dispose(): void {
        this.unsubscribeFns.forEach(unsubscribe => unsubscribe());
        this.unsubscribeFns = [];
        this.stopAllMovements();
        this.animator.dispose();
        this.modeManager.dispose();
        this.inputHandler.dispose();
        this._orbitCamera.dispose();
        this._flightCamera.dispose();
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
