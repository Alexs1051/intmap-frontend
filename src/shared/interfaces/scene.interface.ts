import { Scene, Color3, Vector3 } from "@babylonjs/core";

export interface ISceneComponent {
    initialize(): Promise<void>;
    update(deltaTime: number): void;
    dispose(): void;
}

export interface ILoadableComponent extends ISceneComponent {
    load(onProgress?: (progress: number) => void): Promise<void>;
}

export interface ISceneManager {
    readonly scene: Scene;
    readonly isLoading: boolean;
    loadAll(modelUrl: string | string[]): Promise<void>;
    render(deltaTime: number): void;
    dispose(): void;
    getCameraManager(): any;
    getBuildingManager(): any;
    getMarkerManager(): any;
    getUIManager(): any;
}

export interface IBackgroundManager extends ISceneComponent {
    setScene(scene: Scene): void;
    setFogDensity(density: number): void;
    setSkyColor(color: Color3): void;
    setGradientSky(top: Color3, middle: Color3, bottom: Color3): void;
    setFogEnabled(enabled: boolean): void;
}

export interface IGridManager extends ISceneComponent {
    setScene(scene: Scene): void;
    setOpacity(opacity: number): void;
    setVisible(visible: boolean): void;
    setSize(size: number): void;
    setColor(mainColor: Color3, secondaryColor: Color3): void;
    refresh(): void;
}

export interface ILightingManager extends ISceneComponent {
    setScene(scene: Scene): void;
    setIntensity(hemispheric: number, directional: number): void;
    setLightDirection(direction: Vector3): void;
    setShadowsEnabled(enabled: boolean): void;
    setLightColor(color: Color3): void;
}
