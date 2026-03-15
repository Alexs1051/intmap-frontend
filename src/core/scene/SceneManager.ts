import { Scene, Vector3 } from "@babylonjs/core";
import { BabylonEngine } from "../engine/BabylonEngine";
import { GridManager } from "../../features/grid/GridManager";
import { BackgroundManager } from "../../features/background/BackgroundManager";
import { LightingManager } from "../../features/lighting/LightingManager";
import { CameraManager } from "../../features/camera/CameraManager";
import { UIManager } from "../../features/ui/UIManager";
import { BuildingManager } from "../../features/building/BuildingManager";
import { BuildingBounds } from "../../features/camera/types";

export class SceneManager {
  private static _instance: SceneManager;
  private _scene: Scene;
  private _gridManager: GridManager;
  private _backgroundManager: BackgroundManager;
  private _lightingManager: LightingManager;
  private _cameraManager: CameraManager;
  private _uiManager: UIManager;
  private _buildingManager: BuildingManager;

  private constructor() {
    const engine = BabylonEngine.getInstance();
    this._scene = new Scene(engine.engine);

    // Инициализируем менеджеры в правильном порядке
    this._backgroundManager = BackgroundManager.getInstance(this._scene);
    this._lightingManager = LightingManager.getInstance(this._scene);
    this._gridManager = GridManager.getInstance(this._scene);
    this._cameraManager = CameraManager.getInstance(this._scene, engine.canvas);
    this._buildingManager = BuildingManager.getInstance(this._scene);
    this._uiManager = UIManager.getInstance(this._scene, this._cameraManager);

    console.log("SceneManager initialized");
  }

  public static getInstance(): SceneManager {
    if (!SceneManager._instance) {
      SceneManager._instance = new SceneManager();
    }
    return SceneManager._instance;
  }

  /**
   * Загрузка здания и инициализация камеры
   */
  public async loadBuilding(modelUrl: string): Promise<void> {
    try {
      console.log("📦 Загрузка здания...");
      
      // Загружаем здание
      await this._buildingManager.loadBuilding(modelUrl);
      
      // Получаем границы здания
      const bounds = this.calculateBuildingBounds();
      console.log(`📐 Границы здания: высота ${bounds.maxY.toFixed(1)}м`);
      
      // Передаём границы в камеру
      this._cameraManager.setBuildingBounds(bounds);
      
      // Инициализируем камеру с анимацией
      await this._cameraManager.initialize();
      
      console.log("✅ Приложение готово");
      
    } catch (error) {
      console.error("❌ Ошибка загрузки здания:", error);
    }
  }

  /**
   * Вычисляем границы здания на основе загруженных этажей
   */
  private calculateBuildingBounds(): BuildingBounds {
    const floorCount = this._buildingManager.floorManager.floorCount;
    // Предполагаем высоту этажа 3 метра, если данных нет
    const height = Math.max(floorCount * 3, 30);
    
    return {
      minY: 0,
      maxY: height,
      center: new Vector3(0, height / 2, 0)
    };
  }

  /**
   * Рендер сцены (вызывается каждый кадр)
   */
  public render(): void {
    this._scene.render();
  }

  /**
   * Очистка ресурсов при выгрузке
   */
  public dispose(): void {
    this._scene.dispose();
  }

  // Геттеры
  public get scene(): Scene {
    return this._scene;
  }

  public get cameraManager(): CameraManager {
    return this._cameraManager;
  }

  public get buildingManager(): BuildingManager {
    return this._buildingManager;
  }

  public get uiManager(): UIManager {
    return this._uiManager;
  }

  public get gridManager(): GridManager {
    return this._gridManager;
  }

  public get lightingManager(): LightingManager {
    return this._lightingManager;
  }
}