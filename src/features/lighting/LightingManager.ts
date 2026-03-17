import { Scene, HemisphericLight, DirectionalLight, Vector3, Color3 } from "@babylonjs/core";
import { logger } from "../../core/logger/Logger";

const lightLogger = logger.getLogger('LightingManager');

export class LightingManager {
  private static _instance: LightingManager;
  private _scene: Scene;
  private _hemisphericLight: HemisphericLight;
  private _directionalLight: DirectionalLight;
  private _isInitialized: boolean = false;

  private constructor(scene: Scene) {
    this._scene = scene;
  }

  public static getInstance(scene: Scene): LightingManager {
    if (!LightingManager._instance) {
      LightingManager._instance = new LightingManager(scene);
    }
    return LightingManager._instance;
  }

  public async initialize(onProgress?: (progress: number) => void): Promise<void> {
    lightLogger.debug("Инициализация освещения");
    
    onProgress?.(0.1);
    onProgress?.(0.3);
    this.createHemisphericLight();
    
    onProgress?.(0.6);
    this.createDirectionalLight();
    
    onProgress?.(0.9);
    onProgress?.(0.95);
    this._isInitialized = true;
    onProgress?.(1.0);
    
    lightLogger.info("Освещение инициализировано");
  }

  private createHemisphericLight(): void {
    this._hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), this._scene);
    this._hemisphericLight.diffuse = new Color3(1, 1, 1);
    this._hemisphericLight.specular = new Color3(0.1, 0.1, 0.1);
    this._hemisphericLight.groundColor = new Color3(0.5, 0.5, 0.5);
    this._hemisphericLight.intensity = 0.8;
  }

  private createDirectionalLight(): void {
    this._directionalLight = new DirectionalLight("directionalLight", new Vector3(-1, -2, -1), this._scene);
    this._directionalLight.diffuse = new Color3(1, 1, 1);
    this._directionalLight.specular = new Color3(0.5, 0.5, 0.5);
    this._directionalLight.intensity = 1.2;
    this._directionalLight.position = new Vector3(20, 30, 20);
  }

  public update(_deltaTime: number): void {}

  public setIntensity(hemispheric: number, directional: number): void {
    this._hemisphericLight.intensity = hemispheric;
    this._directionalLight.intensity = directional;
  }

  public setLightDirection(direction: Vector3): void {
    this._directionalLight.direction = direction;
  }

  public get hemisphericLight(): HemisphericLight {
    return this._hemisphericLight;
  }

  public get directionalLight(): DirectionalLight {
    return this._directionalLight;
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }
}