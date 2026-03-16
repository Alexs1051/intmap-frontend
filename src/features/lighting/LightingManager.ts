import { Scene, HemisphericLight, DirectionalLight, Vector3, Color3, ShadowGenerator } from "@babylonjs/core";

export class LightingManager {
  private static _instance: LightingManager;
  private _scene: Scene;
  private _hemisphericLight: HemisphericLight;
  private _directionalLight: DirectionalLight;
  private _shadowGenerator?: ShadowGenerator;
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

  /**
   * Инициализация освещения с возможностью отслеживания прогресса
   */
  public async initialize(onProgress?: (progress: number) => void): Promise<void> {
    console.log("💡 Инициализация освещения...");
    
    // 0-30%: Подготовка
    if (onProgress) onProgress(0.1);
    
    // 30-60%: Создание HemisphericLight
    if (onProgress) onProgress(0.3);
    this.createHemisphericLight();
    
    // 60-90%: Создание DirectionalLight
    if (onProgress) onProgress(0.6);
    this.createDirectionalLight();
    
    // 90-95%: Настройка теней
    if (onProgress) onProgress(0.9);
    this.setupShadows();
    
    // 95-100%: Финализация
    if (onProgress) onProgress(0.95);
    this._isInitialized = true;
    
    if (onProgress) onProgress(1.0);
    
    console.log("✅ Освещение инициализировано");
  }

  private createHemisphericLight(): void {
    this._hemisphericLight = new HemisphericLight(
      "hemisphericLight",
      new Vector3(0, 1, 0),
      this._scene
    );
    
    this._hemisphericLight.diffuse = new Color3(1, 1, 1);
    this._hemisphericLight.specular = new Color3(0.1, 0.1, 0.1);
    this._hemisphericLight.groundColor = new Color3(0.5, 0.5, 0.5);
    this._hemisphericLight.intensity = 0.8;
  }

  private createDirectionalLight(): void {
    this._directionalLight = new DirectionalLight(
      "directionalLight",
      new Vector3(-1, -2, -1),
      this._scene
    );
    
    this._directionalLight.diffuse = new Color3(1, 1, 1);
    this._directionalLight.specular = new Color3(0.5, 0.5, 0.5);
    this._directionalLight.intensity = 1.2;
    this._directionalLight.position = new Vector3(20, 30, 20);
  }

  private setupShadows(): void {
    // Тени можно включить позже, если нужно
    // this._shadowGenerator = new ShadowGenerator(1024, this._directionalLight);
    // this._shadowGenerator.useBlurExponentialShadowMap = true;
    // this._shadowGenerator.blurKernel = 32;
  }

  /**
   * Обновление освещения каждый кадр
   */
  public update(deltaTime: number): void {
    // Здесь можно добавить анимацию света, смену времени суток и т.д.
  }

  /**
   * Изменение интенсивности освещения
   */
  public setIntensity(hemisphericIntensity: number, directionalIntensity: number): void {
    if (this._hemisphericLight) {
      this._hemisphericLight.intensity = hemisphericIntensity;
    }
    if (this._directionalLight) {
      this._directionalLight.intensity = directionalIntensity;
    }
  }

  /**
   * Изменение направления света
   */
  public setLightDirection(direction: Vector3): void {
    if (this._directionalLight) {
      this._directionalLight.direction = direction;
    }
  }

  /**
   * Включение/выключение теней
   */
  public enableShadows(enable: boolean): void {
    if (enable && !this._shadowGenerator) {
      this.setupShadows();
    }
    // Здесь можно добавить логику включения/выключения теней
  }

  // Геттеры
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