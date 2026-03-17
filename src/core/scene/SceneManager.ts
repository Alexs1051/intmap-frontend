import { Scene, Vector3 } from "@babylonjs/core";
import { BabylonEngine } from "../engine/BabylonEngine";
import { GridManager } from "../../features/grid/GridManager";
import { BackgroundManager } from "../../features/background/BackgroundManager";
import { LightingManager } from "../../features/lighting/LightingManager";
import { CameraManager } from "../../features/camera/CameraManager";
import { UIManager } from "../../features/ui/UIManager";
import { BuildingManager } from "../../features/building/BuildingManager";
import { MarkerManager } from "../../features/markers/MarkerManager";
import { logger } from "../logger/Logger";

const sceneLogger = logger.getLogger('SceneManager');

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
    const engine = BabylonEngine.getInstance();
    this._scene = new Scene(engine.engine);
    this._uiManager = uiManager;

    this._backgroundManager = BackgroundManager.getInstance(this._scene);
    this._lightingManager = LightingManager.getInstance(this._scene);
    this._gridManager = GridManager.getInstance(this._scene);
    this._cameraManager = CameraManager.getInstance(this._scene, engine.canvas);
    this._buildingManager = BuildingManager.getInstance(this._scene);
    this._markerManager = MarkerManager.getInstance(this._scene);
    
    this._uiManager.initialize(this._scene, this._cameraManager, this._buildingManager);
    
    this._markerManager.setCameraManager(this._cameraManager);
    this.setupInputHandling(engine.canvas);

    sceneLogger.info("SceneManager инициализирован");
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
      sceneLogger.info("Начинаем загрузку всех ресурсов");
      
      // Этап 1: Сцена (0% - 20%)
      this._uiManager.updateLoadingProgress(0.0, "Загрузка сцены...");
      await this.loadScene();
      
      // Этап 2: Здание (20% - 70%)
      this._uiManager.updateLoadingProgress(0.2, "Загрузка здания...");
      await this.loadBuilding(modelUrl);
      
      // Этап 3: Маркеры (70% - 90%)
      this._uiManager.updateLoadingProgress(0.7, "Создание маркеров...");
      await this.loadMarkers();
      
      // Финализация (90% - 100%)
      this._uiManager.updateLoadingProgress(0.9, "Финализация...");
      await this.finalize();
      
      sceneLogger.info("Все ресурсы загружены");
    } catch (error) {
      sceneLogger.error("Ошибка загрузки", error);
      throw error;
    } finally {
      this._isLoading = false;
    }
  }

  private async loadScene(): Promise<void> {
    sceneLogger.debug("Этап 1: Загрузка сцены");
    
    await Promise.all([
      this._backgroundManager.initialize((progress) => {
        this._uiManager.updateLoadingProgress(0.0 + progress * 0.05, "Создание фона...");
      }),
      this._lightingManager.initialize((progress) => {
        this._uiManager.updateLoadingProgress(0.05 + progress * 0.05, "Настройка освещения...");
      }),
      this._gridManager.initialize((progress) => {
        this._uiManager.updateLoadingProgress(0.10 + progress * 0.05, "Создание сетки...");
      })
    ]);
    
    this._uiManager.updateLoadingProgress(0.15, "Настройка камеры...");
    sceneLogger.debug("Этап 1 завершён");
  }

  private async loadBuilding(modelUrl: string): Promise<void> {
    sceneLogger.debug("Этап 2: Загрузка здания");
    
    await this._buildingManager.loadBuilding(modelUrl, (progress) => {
      this._uiManager.updateLoadingProgress(0.2 + progress * 0.5, "Загрузка модели здания...");
    });
    
    const dimensions = this._buildingManager.getBuildingDimensions();
    const center = this._buildingManager.getBuildingCenter();
    
    this._cameraManager.setDimensions(dimensions);
    this._cameraManager.setTargetPosition(center);
    
    sceneLogger.debug(`Этап 2 завершён, размеры здания: ${JSON.stringify(dimensions)}`);
  }

  private async loadMarkers(): Promise<void> {
    sceneLogger.debug("Этап 3: Создание маркеров");
    
    await this._markerManager.initialize((progress) => {
      const totalProgress = 0.7 + progress * 0.2;
      
      let status: string;
      if (progress < 0.3) {
        status = "Инициализация маркеров...";
      } else if (progress < 0.6) {
        status = "Создание маркеров...";
      } else {
        status = "Настройка маркеров...";
      }
      
      this._uiManager.updateLoadingProgress(totalProgress, status);
    });
    
    sceneLogger.debug("Этап 3 завершён");
  }

  private async finalize(): Promise<void> {
    sceneLogger.debug("Финализация");
    
    this._uiManager.updateLoadingProgress(0.90, "Подготовка к анимации...");
    this._uiManager.updateLoadingProgress(0.95, "Готово!");
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this._uiManager.updateLoadingProgress(1.0, "Загрузка завершена!");
  }

  public async showScene(): Promise<void> {
    sceneLogger.info("Запуск анимаций");
    
    await Promise.all([
      this._cameraManager.initialize(),
      this._buildingManager.animateConstruction()
    ]);
    
    sceneLogger.info("Все анимации завершены");
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
    sceneLogger.info("SceneManager уничтожен");
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