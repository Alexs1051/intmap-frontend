import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";
import { CameraMode, CameraTransform, BuildingDimensions } from "../types";
import { ILoadableComponent } from "./scene.interface";

export interface ICameraManager extends ILoadableComponent {
    readonly camera: ArcRotateCamera;
    readonly isAnimating: boolean;
    readonly cameraMode: CameraMode;
    readonly targetPosition: Vector3;

    setScene(scene: Scene): void;
    initialize(): Promise<void>;
    update(deltaTime: number): void;

    toggleCameraMode(): Promise<void>;
    switchToMode(mode: CameraMode): Promise<void>;

    focusOnPoint(point: Vector3, distance?: number, duration?: number): Promise<void>;
    focusOnRoute(positions: Vector3[], duration?: number): Promise<void>;
    resetCamera(): Promise<void>;

    canInteractWithUI(): boolean;
    setDimensions(dimensions: BuildingDimensions): void;
    setTargetPosition(position: Vector3): void;

    dispose(): void;
}

export interface ICameraAnimator {
    readonly isAnimating: boolean;

    setScene(scene: Scene): void;
    animateTo(camera: ArcRotateCamera, target: CameraTransform, duration?: number): Promise<void>;
    animateZoom(camera: ArcRotateCamera, targetRadius: number, duration?: number): Promise<void>;
    playIntroAnimation(
        camera: ArcRotateCamera,
        targetPosition: Vector3,
        buildingHeight: number,
        duration?: number,
        startTransform?: CameraTransform,
        endTransform?: CameraTransform
    ): Promise<void>;
    stopAnimation(): void;
    dispose(): void;
}

export interface ICameraModeManager {
    readonly mode: CameraMode;
    readonly is2DMode: boolean;
    readonly is3DMode: boolean;
    readonly pivotPoint: Vector3;

    setPivotPoint(point: Vector3): void;
    getPivotPoint(): Vector3;
    setDimensions(dimensions: BuildingDimensions): void;

    get2DTransform(currentAlpha: number, currentRadius: number): CameraTransform;
    get3DTransform(currentAlpha: number, currentBeta: number, currentRadius: number): CameraTransform;
    getFocusTransform(point: Vector3, currentAlpha: number, currentBeta: number, distance: number): CameraTransform;
    getResetTransform(): CameraTransform;
    getInitialTransform(): CameraTransform;

    getConstraints(): { minBeta: number; maxBeta: number; minRadius: number };
    setMode(mode: CameraMode): void;

    dispose(): void;
}

export interface ICameraInputHandler {
    setOrbitCallbacks(
        onRotate: (dx: number, dy: number) => void,
        onPan: (dx: number, dy: number) => void,
        onZoom: (delta: number) => void
    ): void;
    setMode(mode: CameraMode): void;
    canInteractWithUI(): boolean;
    attachToCanvas(canvas: HTMLCanvasElement): void;
    setCameraManager(cameraManager: ICameraManager): void;
    dispose(): void;
}