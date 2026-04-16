import { ArcRotateCamera, Scene, Vector3, UniversalCamera } from "@babylonjs/core";
import { CameraMode, CameraTransform, BuildingDimensions } from "@shared/types";
import { ILoadableComponent } from "./scene.interface";

export interface ICameraManager extends ILoadableComponent {
    readonly camera: ArcRotateCamera;
    readonly flightCamera: UniversalCamera;
    readonly activeCamera: ArcRotateCamera | UniversalCamera;
    readonly isAnimating: boolean;
    readonly cameraMode: CameraMode;
    readonly targetPosition: Vector3;

    setScene(scene: Scene): void;
    initialize(customStart?: CameraTransform, customEnd?: CameraTransform): Promise<void>;
    update(deltaTime: number): void;
    toggleCameraMode(): Promise<void>;
    switchToMode(mode: CameraMode): Promise<void>;
    toggleControlMode(): Promise<void>;
    focusOnPoint(point: Vector3, distance?: number, duration?: number): Promise<void>;
    focusOnRoute(positions: Vector3[], duration?: number): Promise<void>;
    focusOnFloor(floorLevel: number, buildingCenter: Vector3, floorHeight: number): Promise<void>;
    resetCamera(): Promise<void>;
    setDimensions(dimensions: BuildingDimensions): void;
    setTargetPosition(position: Vector3): void;
    getPivotForCurrentContext(): Vector3;
    dispose(): void;
}

export interface ICameraAnimator {
    readonly isAnimating: boolean;
    setScene(scene: Scene): void;

    // Основные методы анимации
    animateCamera(
        camera: ArcRotateCamera | UniversalCamera,
        targetTransform: Partial<CameraTransform> | { position?: Vector3; target?: Vector3 },
        duration?: number,
        onProgress?: (progress: number) => void
    ): Promise<void>;

    // Для обратной совместимости с ArcRotateCamera
    animateTo(camera: ArcRotateCamera, target: CameraTransform, duration?: number): Promise<void>;

    // Специальный метод для UniversalCamera
    animatePosition(
        camera: UniversalCamera,
        targetPosition: Vector3,
        targetTarget?: Vector3,
        duration?: number
    ): Promise<void>;

    // Анимация последовательности шагов
    animateSequence(
        camera: ArcRotateCamera | UniversalCamera,
        steps: Array<{
            transform: Partial<CameraTransform> | { position?: Vector3; target?: Vector3 };
            duration: number;
        }>
    ): Promise<void>;

    stopAnimation(): void;
    dispose(): void;
}

export interface ICameraModeManager {
    readonly mode: CameraMode;
    readonly is2DMode: boolean;
    readonly is3DMode: boolean;
    readonly isOrbitMode: boolean;
    readonly isFreeFlightMode: boolean;
    readonly pivotPoint: Vector3;
    readonly currentFloor: number;
    readonly buildingCenter: Vector3;
    readonly floorHeight: number;
    readonly viewMode: 'single' | 'all';
    readonly isFloorExpanded: boolean;

    setPivotPoint(point: Vector3): void;
    getPivotPoint(): Vector3;
    setDimensions(dimensions: BuildingDimensions): void;
    setBuildingCenter(center: Vector3): void;
    setMode(mode: CameraMode): void;
    setCurrentContext(floor: number, center: Vector3, height: number): void;
    setCurrentFloor(floor: number | 'all'): void;
    setViewMode(mode: 'single' | 'all'): void;
    setFloorExpanded(expanded: boolean): void;
    dispose(): void;
}

export interface ICameraInputHandler {
    setMode(mode: CameraMode): void;
    attachToCanvas(canvas: HTMLCanvasElement): void;
    setCameraManager(cameraManager: ICameraManager): void;
    setOrbitCamera(orbitCamera: ArcRotateCamera): void;
    setFlightCamera(flightCamera: UniversalCamera): void;
    updateSensitivity(mode: CameraMode): void;
    dispose(): void;
}
