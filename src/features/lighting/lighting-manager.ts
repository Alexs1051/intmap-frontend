import { Scene, HemisphericLight, DirectionalLight, Vector3, Color3, ShadowGenerator, AbstractMesh } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { LIGHTING } from "@shared/constants";
import { ILightingManager, ILoadableComponent } from "@shared/interfaces";

/**
 * Менеджер освещения
 * Управляет источниками света и тенями сцены
 */
@injectable()
export class LightingManager implements ILightingManager, ILoadableComponent {
  private scene!: Scene;
  private logger: Logger;

  private hemisphericLight!: HemisphericLight;
  private directionalLight!: DirectionalLight;
  private shadowGenerator: ShadowGenerator | null = null;
  private isInitializedFlag: boolean = false;
  private shadowsEnabled: boolean = LIGHTING.SHADOWS_ENABLED;

  private hemisphericIntensityValue: number = LIGHTING.HEMISPHERIC_INTENSITY;
  private directionalIntensityValue: number = LIGHTING.DIRECTIONAL_INTENSITY;
  private hemisphericColor: Color3 = LIGHTING.HEMISPHERIC_COLOR;
  private directionalColor: Color3 = LIGHTING.DIRECTIONAL_COLOR;
  private lightDirection: Vector3 = LIGHTING.DIRECTION;

  constructor(@inject(TYPES.Logger) logger: Logger) {
    this.logger = logger.getLogger('LightingManager');
  }

  public setScene(scene: Scene): void {
    this.scene = scene;
  }

  public async load(onProgress?: (progress: number) => void): Promise<void> {
    if (!this.scene) {
      throw new Error("Scene not set");
    }

    onProgress?.(0.3);
    this.createHemisphericLight();

    onProgress?.(0.6);
    this.createDirectionalLight();

    onProgress?.(0.9);
    if (this.shadowsEnabled) {
      this.enableShadows();
    }

    onProgress?.(1.0);
    this.logger.info("Lighting loaded");
  }

  public async initialize(): Promise<void> {
    if (this.isInitializedFlag) return;

    this.applyIntensity();
    this.applyDirection();

    this.isInitializedFlag = true;
    this.logger.info("Lighting initialized");
  }

  public update(_deltaTime: number): void { }

  /**
   * Создать окружающее освещение (hemispheric)
   */
  private createHemisphericLight(): void {
    this.hemisphericLight = new HemisphericLight(
      "hemisphericLight",
      new Vector3(0, 1, 0),
      this.scene
    );
    this.hemisphericLight.diffuse = this.hemisphericColor;
    this.hemisphericLight.specular = LIGHTING.HEMISPHERIC_SPECULAR;
    this.hemisphericLight.groundColor = LIGHTING.GROUND_COLOR;
    this.hemisphericLight.intensity = this.hemisphericIntensityValue;
  }

  /**
   * Создать направленное освещение
   */
  private createDirectionalLight(): void {
    this.directionalLight = new DirectionalLight(
      "directionalLight",
      this.lightDirection,
      this.scene
    );
    this.directionalLight.diffuse = this.directionalColor;
    this.directionalLight.specular = LIGHTING.DIRECTIONAL_SPECULAR;
    this.directionalLight.intensity = this.directionalIntensityValue;
    this.directionalLight.position = LIGHTING.POSITION;
  }

  /**
   * Применить текущие значения интенсивности
   */
  private applyIntensity(): void {
    if (this.hemisphericLight) {
      this.hemisphericLight.intensity = this.hemisphericIntensityValue;
    }
    if (this.directionalLight) {
      this.directionalLight.intensity = this.directionalIntensityValue;
    }
  }

  /**
   * Применить направление света
   */
  private applyDirection(): void {
    if (this.directionalLight) {
      this.directionalLight.direction = this.lightDirection.normalize();
    }
  }

  /**
   * Включить тени
   */
  private enableShadows(): void {
    if (!this.directionalLight) {
      this.logger.warn("Cannot enable shadows: directional light not ready");
      return;
    }

    this.shadowGenerator = new ShadowGenerator(LIGHTING.SHADOW_MAP_SIZE, this.directionalLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurScale = LIGHTING.SHADOW_BLUR_SCALE;

    this.logger.info("Shadows enabled");
  }

  /**
   * Отключить тени
   */
  private disableShadows(): void {
    this.shadowGenerator?.dispose();
    this.shadowGenerator = null;
    this.logger.info("Shadows disabled");
  }

  /**
   * Установить интенсивность освещения (0-2)
   */
  public setIntensity(hemispheric: number, directional: number): void {
    this.hemisphericIntensityValue = this.clampIntensity(hemispheric);
    this.directionalIntensityValue = this.clampIntensity(directional);
    this.applyIntensity();
  }

  /**
   * Установить направление света
   */
  public setLightDirection(direction: Vector3): void {
    this.lightDirection = direction;
    this.applyDirection();
  }

  /**
   * Включить/выключить тени
   */
  public setShadowsEnabled(enabled: boolean): void {
    this.shadowsEnabled = enabled;
    if (enabled) {
      this.enableShadows();
    } else {
      this.disableShadows();
    }
  }

  /**
   * Установить цвет направленного света
   */
  public setLightColor(color: Color3): void {
    this.directionalColor = color;
    if (this.directionalLight) {
      this.directionalLight.diffuse = color;
    }
  }

  /**
   * Добавить объект в генератор теней
   */
  public addShadowCaster(mesh: AbstractMesh): void {
    this.shadowGenerator?.addShadowCaster(mesh);
  }

  /**
   * Удалить объект из генератора теней
   */
  public removeShadowCaster(mesh: AbstractMesh): void {
    this.shadowGenerator?.removeShadowCaster(mesh);
  }

  public dispose(): void {
    this.shadowGenerator?.dispose();
    this.hemisphericLight?.dispose();
    this.directionalLight?.dispose();
    this.logger.info("LightingManager disposed");
  }

  /**
   * Ограничить интенсивность допустимым диапазоном
   */
  private clampIntensity(value: number): number {
    return Math.max(LIGHTING.MIN_INTENSITY, Math.min(LIGHTING.MAX_INTENSITY, value));
  }

  // Геттеры
  public get isInitialized(): boolean {
    return this.isInitializedFlag;
  }

  public get hemisphericIntensity(): number {
    return this.hemisphericIntensityValue;
  }

  public get directionalIntensity(): number {
    return this.directionalIntensityValue;
  }

  public get shadowsActive(): boolean {
    return this.shadowGenerator !== null;
  }
}
