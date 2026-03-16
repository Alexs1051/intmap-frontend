import { Scene, Color3, Color4 } from "@babylonjs/core";
import { 
  SKY_COLOR_TOP, 
  SKY_COLOR_BOTTOM,
  FOG_ENABLED,
  FOG_DENSITY,
  FOG_COLOR
} from "../../shared/constants";

export class BackgroundManager {
  private static _instance: BackgroundManager;
  private _scene: Scene;
  private _isInitialized: boolean = false;

  private constructor(scene: Scene) {
    this._scene = scene;
  }

  public static getInstance(scene: Scene): BackgroundManager {
    if (!BackgroundManager._instance) {
      BackgroundManager._instance = new BackgroundManager(scene);
    }
    return BackgroundManager._instance;
  }

  /**
   * Инициализация фона с возможностью отслеживания прогресса
   */
  public async initialize(onProgress?: (progress: number) => void): Promise<void> {
    console.log("🎨 Инициализация фона...");
    
    // 0-30%: Подготовка
    if (onProgress) onProgress(0.1);
    
    // 30-60%: Создание фона
    if (onProgress) onProgress(0.3);
    this.createGradientBackground();
    
    // 60-90%: Настройка тумана
    if (onProgress) onProgress(0.6);
    if (FOG_ENABLED) {
      this.createFog();
    }
    
    // 90-100%: Финализация
    if (onProgress) onProgress(0.9);
    this._isInitialized = true;
    
    if (onProgress) onProgress(1.0);
    
    console.log("✅ Фон инициализирован");
  }

  private createGradientBackground(): void {
    // Простой цвет фона - средний между верхом и низом
    const midColor = new Color3(
      (SKY_COLOR_TOP.r + SKY_COLOR_BOTTOM.r) / 2,
      (SKY_COLOR_TOP.g + SKY_COLOR_BOTTOM.g) / 2,
      (SKY_COLOR_TOP.b + SKY_COLOR_BOTTOM.b) / 2
    );
    
    this._scene.clearColor = new Color4(midColor.r, midColor.g, midColor.b, 1.0);
  }

  private createFog(): void {
    this._scene.fogMode = Scene.FOGMODE_EXP;
    this._scene.fogDensity = FOG_DENSITY;
    this._scene.fogColor = FOG_COLOR.clone();
  }

  /**
   * Обновление параметров фона (если нужно)
   */
  public update(deltaTime: number): void {
    // Здесь можно добавить анимацию фона, изменение цвета по времени суток и т.д.
  }

  /**
   * Изменение цвета фона
   */
  public setBackgroundColor(color: Color3): void {
    this._scene.clearColor = new Color4(color.r, color.g, color.b, 1.0);
  }

  /**
   * Изменение плотности тумана
   */
  public setFogDensity(density: number): void {
    this._scene.fogDensity = density;
  }

  // Геттеры
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get fogDensity(): number {
    return this._scene.fogDensity;
  }
}