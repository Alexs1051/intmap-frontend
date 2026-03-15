import { Scene, HemisphericLight, DirectionalLight, Vector3, Color3, ShadowGenerator } from "@babylonjs/core";

export class LightingManager {
  private static _instance: LightingManager;
  private _scene: Scene;
  private _hemisphericLight: HemisphericLight;
  private _directionalLight: DirectionalLight;
  private _shadowGenerator?: ShadowGenerator;

  private constructor(scene: Scene) {
    this._scene = scene;
    this.setupLights();
  }

  public static getInstance(scene: Scene): LightingManager {
    if (!LightingManager._instance) {
      LightingManager._instance = new LightingManager(scene);
    }
    return LightingManager._instance;
  }

  private setupLights(): void {
    // 1. HemisphericLight (окружающий свет) - освещает всё равномерно
    this._hemisphericLight = new HemisphericLight(
      "hemisphericLight",
      new Vector3(0, 1, 0),
      this._scene
    );
    
    // Настраиваем цвета для HemisphericLight
    this._hemisphericLight.diffuse = new Color3(1, 1, 1);      // Белый диффузный свет
    this._hemisphericLight.specular = new Color3(0.1, 0.1, 0.1); // Слабые блики
    this._hemisphericLight.groundColor = new Color3(0.5, 0.5, 0.5); // Свет от земли

    // 2. DirectionalLight (направленный свет) - создаёт тени и объём
    this._directionalLight = new DirectionalLight(
      "directionalLight",
      new Vector3(-1, -2, -1), // Направление света (сверху-сбоку)
      this._scene
    );
    
    // Настраиваем направленный свет
    this._directionalLight.diffuse = new Color3(1, 1, 1);      // Белый свет
    this._directionalLight.specular = new Color3(0.5, 0.5, 0.5); // Средние блики
    this._directionalLight.intensity = 1.5; // Ярче, чем Hemispheric

    // Позиционируем источник света
    this._directionalLight.position = new Vector3(20, 30, 20);
    
    // Настраиваем тени (опционально)
    this.setupShadows();

    console.log("💡 Освещение настроено");
  }

  private setupShadows(): void {
    // Включаем тени (если нужно)
    // this._shadowGenerator = new ShadowGenerator(1024, this._directionalLight);
    // this._shadowGenerator.useBlurExponentialShadowMap = true;
    // this._shadowGenerator.blurKernel = 32;
  }

  /**
   * Изменение интенсивности освещения
   */
  public setIntensity(hemisphericIntensity: number, directionalIntensity: number): void {
    this._hemisphericLight.intensity = hemisphericIntensity;
    this._directionalLight.intensity = directionalIntensity;
  }

  /**
   * Изменение направления света
   */
  public setLightDirection(direction: Vector3): void {
    this._directionalLight.direction = direction;
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
}