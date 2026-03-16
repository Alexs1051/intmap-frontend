import { Scene, Vector3 } from "@babylonjs/core";
import { BabylonEngine } from "../engine/BabylonEngine";
import { GridManager } from "../../features/grid/GridManager";
import { BackgroundManager } from "../../features/background/BackgroundManager";
import { LightingManager } from "../../features/lighting/LightingManager";
import { CameraManager } from "../../features/camera/CameraManager";
import { UIManager } from "../../features/ui/UIManager";
import { BuildingManager } from "../../features/building/BuildingManager";
import { BuildingBounds } from "../../features/camera/types";
import { MarkerManager } from "../../features/markers/MarkerManager";

export class SceneManager {
  private static _instance: SceneManager;
  private _scene: Scene;
  private _gridManager: GridManager;
  private _backgroundManager: BackgroundManager;
  private _lightingManager: LightingManager;
  private _cameraManager: CameraManager;
  private _uiManager: UIManager;
  private _buildingManager: BuildingManager;
  private _markerManager: MarkerManager;
  
  private _isLoading: boolean = false;

  private constructor(uiManager: UIManager) {
    console.log("🔧 SceneManager constructor called");
    
    const engine = BabylonEngine.getInstance();
    this._scene = new Scene(engine.engine);
    
    this._uiManager = uiManager;

    this._backgroundManager = BackgroundManager.getInstance(this._scene);
    this._lightingManager = LightingManager.getInstance(this._scene);
    this._gridManager = GridManager.getInstance(this._scene);
    this._cameraManager = CameraManager.getInstance(this._scene, engine.canvas);
    this._buildingManager = BuildingManager.getInstance(this._scene);
    this._markerManager = MarkerManager.getInstance(this._scene);
    
    this._uiManager.initialize(this._scene, this._cameraManager);
    this._markerManager.setCameraManager(this._cameraManager);
    this.setupInputHandling(engine.canvas);

    console.log("SceneManager initialized");
  }

  public static getInstance(uiManager: UIManager): SceneManager {
    if (!SceneManager._instance) {
      SceneManager._instance = new SceneManager(uiManager);
    }
    return SceneManager._instance;
  }

  private setupInputHandling(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('click', (event) => {
      if (this._cameraManager.isAnimating) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const ray = this._scene.createPickingRay(x, y, null, this._cameraManager.camera);
      this._markerManager.handleScenePick(ray);
    });
  }

  public async loadAll(modelUrl: string): Promise<void> {
    if (this._isLoading) return;

    this._isLoading = true;

    try {
      console.log("🚀 Начинаем загрузку всех ресурсов...");
      
      this._uiManager.updateLoadingProgress(0.0, "Загрузка сцены...");
      await this.loadScene();
      
      this._uiManager.updateLoadingProgress(0.2, "Загрузка здания...");
      await this.loadBuilding(modelUrl);
      
      this._uiManager.updateLoadingProgress(0.7, "Создание маркеров...");
      await this.loadMarkers();
      
      this._uiManager.updateLoadingProgress(0.9, "Финализация...");
      await this.finalize();
      
      console.log("✅ Все ресурсы загружены");
      
    } catch (error) {
      console.error("❌ Ошибка загрузки:", error);
      throw error;
    } finally {
      this._isLoading = false;
    }
  }

  private async loadScene(): Promise<void> {
    console.log("🎬 Этап 1: Загрузка сцены");
    
    const backgroundPromise = this._backgroundManager.initialize((progress) => {
      this._uiManager.updateLoadingProgress(0.0 + progress * 0.05, "Создание фона...");
    });
    
    const lightingPromise = this._lightingManager.initialize((progress) => {
      this._uiManager.updateLoadingProgress(0.05 + progress * 0.05, "Настройка освещения...");
    });
    
    const gridPromise = this._gridManager.initialize((progress) => {
      this._uiManager.updateLoadingProgress(0.10 + progress * 0.05, "Создание сетки...");
    });
    
    await Promise.all([backgroundPromise, lightingPromise, gridPromise]);
    
    this._uiManager.updateLoadingProgress(0.15, "Настройка камеры...");
    console.log("✅ Этап 1 завершён");
  }

  private async loadBuilding(modelUrl: string): Promise<void> {
    console.log("🏗 Этап 2: Загрузка здания");
    
    await this._buildingManager.loadBuilding(modelUrl, (fileProgress) => {
      const totalProgress = 0.2 + (fileProgress * 0.5);
      this._uiManager.updateLoadingProgress(totalProgress, "Загрузка модели здания...");
    });
    
    const bounds = this.calculateBuildingBounds();
    this._cameraManager.setBuildingBounds(bounds);
    
    console.log("✅ Этап 2 завершён");
  }

  private async loadMarkers(): Promise<void> {
    console.log("📍 Этап 3: Создание маркеров");
    
    await this._markerManager.initialize((progress) => {
      const totalProgress = 0.7 + (progress * 0.2);
      
      if (progress < 0.3) {
        this._uiManager.updateLoadingProgress(totalProgress, "Инициализация маркеров...");
      } else if (progress < 0.6) {
        this._uiManager.updateLoadingProgress(totalProgress, "Создание маркеров...");
      } else {
        this._uiManager.updateLoadingProgress(totalProgress, "Настройка маркеров...");
      }
    });
    
    console.log("✅ Этап 3 завершён");
  }

  private async finalize(): Promise<void> {
    console.log("✨ Финализация");
    
    this._uiManager.updateLoadingProgress(0.90, "Подготовка к анимации...");
    this._uiManager.updateLoadingProgress(0.95, "Готово!");
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this._uiManager.updateLoadingProgress(1.0, "Загрузка завершена!");
  }

  public async showScene(): Promise<void> {
    console.log("🎬 Запуск анимаций...");
    
    // Запускаем анимации параллельно
    await Promise.all([
      this._cameraManager.initialize(),        // Анимация камеры
      this._buildingManager.animateConstruction() // Анимация здания
    ]);
    
    console.log("✅ Все анимации завершены");
  }

  private calculateBuildingBounds(): BuildingBounds {
    const floorCount = this._buildingManager.floorManager.floorCount;
    const height = Math.max(floorCount * 3, 30);
    
    return {
      minY: 0,
      maxY: height,
      center: new Vector3(0, height / 2, 0)
    };
  }

  public render(deltaTime: number): void {
    if (this._cameraManager.camera) {
      this._markerManager.update(this._cameraManager.camera.position);
    }
    
    this._backgroundManager.update(deltaTime);
    this._lightingManager.update(deltaTime);
    this._gridManager.update(deltaTime);
    
    this._scene.render();
  }

  public dispose(): void {
    this._scene.dispose();
  }

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

  public get markerManager(): MarkerManager {
    return this._markerManager;
  }

  public get isLoading(): boolean {
    return this._isLoading;
  }
}