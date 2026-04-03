import { Scene, HemisphericLight, DirectionalLight, Vector3, Color3, ShadowGenerator } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { ILightingManager, ILoadableComponent } from "@shared/interfaces";

/**
 * Конфигурация освещения по умолчанию
 */
const DEFAULT_LIGHTING_CONFIG = {
  hemisphericIntensity: 0.8,
  directionalIntensity: 1.2,
  hemisphericColor: new Color3(1, 1, 1),
  directionalColor: new Color3(1, 1, 1),
  lightDirection: new Vector3(-1, -2, -1),
  shadowsEnabled: false,
  shadowMapSize: 1024
};

/**
 * Менеджер освещения
 * Управляет всеми источниками света в сцене
 */
@injectable()
export class LightingManager implements ILightingManager, ILoadableComponent {
  private scene!: Scene;
  private logger: Logger;
  
  private hemisphericLight!: HemisphericLight;
  private directionalLight!: DirectionalLight;
  private shadowGenerator: ShadowGenerator | null = null;
  private _isInitialized: boolean = false;
  private shadowsEnabled: boolean = DEFAULT_LIGHTING_CONFIG.shadowsEnabled;
  private lightConfig = { ...DEFAULT_LIGHTING_CONFIG };

  constructor(
    @inject(TYPES.Logger) logger: Logger  ) {
    this.logger = logger.getLogger('LightingManager');
  }

  /**
   * Установить сцену (вызывается SceneManager после создания)
   */
  public setScene(scene: Scene): void {
    this.scene = scene;
    this.logger.debug("Scene set");
  }

  public async load(onProgress?: (progress: number) => void): Promise<void> {
    this.logger.debug("Loading lighting manager");
    
    if (!this.scene) {
      this.logger.error("Scene not set before load");
      throw new Error("Scene not set");
    }
    
    onProgress?.(0.3);
    
    // Создаем освещение
    this.createHemisphericLight();
    
    onProgress?.(0.6);
    
    this.createDirectionalLight();
    
    onProgress?.(0.9);
    
    // Настраиваем тени, если включены
    if (this.shadowsEnabled) {
      this.enableShadows();
    }
    
    onProgress?.(1.0);
    this.logger.info("Lighting manager loaded");
  }

  public async initialize(): Promise<void> {
    this.logger.debug("Initializing lighting manager");
    
    if (this._isInitialized) return;
    
    // Применяем начальные настройки
    this.setIntensity(
      this.lightConfig.hemisphericIntensity,
      this.lightConfig.directionalIntensity
    );
    this.setLightDirection(this.lightConfig.lightDirection);
    
    this._isInitialized = true;
    this.logger.info("Lighting manager initialized");
  }

  public update(_deltaTime: number): void {
    // Освещение не требует обновления
  }

  /**
   * Создать окружающее освещение
   */
  private createHemisphericLight(): void {
    this.hemisphericLight = new HemisphericLight(
      "hemisphericLight",
      new Vector3(0, 1, 0),
      this.scene
    );
    this.hemisphericLight.diffuse = this.lightConfig.hemisphericColor;
    this.hemisphericLight.specular = new Color3(0.1, 0.1, 0.1);
    this.hemisphericLight.groundColor = new Color3(0.5, 0.5, 0.5);
    this.hemisphericLight.intensity = this.lightConfig.hemisphericIntensity;
  }

  /**
   * Создать направленное освещение
   */
  private createDirectionalLight(): void {
    this.directionalLight = new DirectionalLight(
      "directionalLight",
      this.lightConfig.lightDirection,
      this.scene
    );
    this.directionalLight.diffuse = this.lightConfig.directionalColor;
    this.directionalLight.specular = new Color3(0.5, 0.5, 0.5);
    this.directionalLight.intensity = this.lightConfig.directionalIntensity;
    this.directionalLight.position = new Vector3(20, 30, 20);
  }

  /**
   * Включить тени
   */
  private enableShadows(): void {
    if (!this.directionalLight) {
      this.logger.warn("Cannot enable shadows: directional light not created");
      return;
    }
    
    this.shadowGenerator = new ShadowGenerator(
      this.lightConfig.shadowMapSize,
      this.directionalLight
    );
    
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurScale = 2;
    
    this.logger.info("Shadows enabled");
  }

  /**
   * Отключить тени
   */
  private disableShadows(): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.dispose();
      this.shadowGenerator = null;
    }
    this.logger.info("Shadows disabled");
  }

  // === Публичные методы ===

  public setIntensity(hemispheric: number, directional: number): void {
    this.lightConfig.hemisphericIntensity = Math.max(0, Math.min(2, hemispheric));
    this.lightConfig.directionalIntensity = Math.max(0, Math.min(2, directional));
    
    if (this.hemisphericLight) {
      this.hemisphericLight.intensity = this.lightConfig.hemisphericIntensity;
    }
    if (this.directionalLight) {
      this.directionalLight.intensity = this.lightConfig.directionalIntensity;
    }
  }

  public setLightDirection(direction: Vector3): void {
    this.lightConfig.lightDirection = direction.normalize();
    if (this.directionalLight) {
      this.directionalLight.direction = this.lightConfig.lightDirection;
    }
  }

  public setShadowsEnabled(enabled: boolean): void {
    this.shadowsEnabled = enabled;
    if (enabled) {
      this.enableShadows();
    } else {
      this.disableShadows();
    }
  }

  public setLightColor(color: Color3): void {
    this.lightConfig.directionalColor = color;
    if (this.directionalLight) {
      this.directionalLight.diffuse = color;
    }
  }

  public setHemisphericColor(color: Color3): void {
    this.lightConfig.hemisphericColor = color;
    if (this.hemisphericLight) {
      this.hemisphericLight.diffuse = color;
    }
  }

  /**
   * Добавить объект в генератор теней
   */
  public addShadowCaster(mesh: any): void {
    if (this.shadowGenerator && mesh) {
      this.shadowGenerator.addShadowCaster(mesh);
    }
  }

  /**
   * Удалить объект из генератора теней
   */
  public removeShadowCaster(mesh: any): void {
    if (this.shadowGenerator && mesh) {
      this.shadowGenerator.removeShadowCaster(mesh);
    }
  }

  public dispose(): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.dispose();
    }
    if (this.hemisphericLight) {
      this.hemisphericLight.dispose();
    }
    if (this.directionalLight) {
      this.directionalLight.dispose();
    }
    this.logger.info("LightingManager disposed");
  }

  // Геттеры
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get hemisphericIntensity(): number {
    return this.lightConfig.hemisphericIntensity;
  }

  public get directionalIntensity(): number {
    return this.lightConfig.directionalIntensity;
  }

  public get shadowsActive(): boolean {
    return this.shadowGenerator !== null;
  }
}