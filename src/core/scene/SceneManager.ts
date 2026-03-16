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
  
  // Флаги загрузки
  private _isLoading: boolean = false;
  private _loadingStage: string = '';
  private _loadingProgress: number = 0;

  private constructor() {
    const engine = BabylonEngine.getInstance();
    this._scene = new Scene(engine.engine);

    // Инициализируем менеджеры (без данных)
    this._backgroundManager = BackgroundManager.getInstance(this._scene);
    this._lightingManager = LightingManager.getInstance(this._scene);
    this._gridManager = GridManager.getInstance(this._scene);
    this._cameraManager = CameraManager.getInstance(this._scene, engine.canvas);
    this._buildingManager = BuildingManager.getInstance(this._scene);
    this._uiManager = UIManager.getInstance(this._scene, this._cameraManager);
    this._markerManager = MarkerManager.getInstance(this._scene);
    
    this._markerManager.setCameraManager(this._cameraManager);
    this.setupInputHandling(engine.canvas);

    console.log("SceneManager initialized");
  }

  public static getInstance(): SceneManager {
    if (!SceneManager._instance) {
      SceneManager._instance = new SceneManager();
    }
    return SceneManager._instance;
  }

  private setupInputHandling(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('click', (event) => {
      if (this._cameraManager.isAnimating) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const ray = this._scene.createPickingRay(
        x, 
        y, 
        null, 
        this._cameraManager.camera
      );
      
      this._markerManager.handleScenePick(ray);
    });
  }

  /**
   * Загрузка всех ресурсов в 3 этапа
   */
  public async loadAll(
    modelUrl: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<void> {
    if (this._isLoading) {
      console.warn("Загрузка уже идёт");
      return;
    }

    this._isLoading = true;
    this._loadingStage = 'start';
    this._loadingProgress = 0;

    try {
      console.log("🚀 Начинаем загрузку всех ресурсов...");
      
      // === ЭТАП 1: Сцена (0% - 20%) ===
      this._loadingStage = 'scene';
      this.updateProgress(0.0, "Загрузка сцены...", onProgress);
      await this.loadScene(onProgress);
      
      // === ЭТАП 2: Здание (20% - 70%) ===
      this._loadingStage = 'building';
      this.updateProgress(0.2, "Загрузка здания...", onProgress);
      await this.loadBuilding(modelUrl, onProgress);
      
      // === ЭТАП 3: Маркеры (70% - 90%) ===
      this._loadingStage = 'markers';
      this.updateProgress(0.7, "Создание маркеров...", onProgress);
      await this.loadMarkers(onProgress);
      
      // === ФИНАЛ: Готово (90% - 100%) ===
      this.updateProgress(0.9, "Финализация...", onProgress);
      await this.finalize(onProgress);
      
      console.log("✅ Все ресурсы загружены");
      
    } catch (error) {
      console.error("❌ Ошибка загрузки:", error);
      throw error;
    } finally {
      this._isLoading = false;
    }
  }

  /**
   * ЭТАП 1: Загрузка сцены (0-20%)
   */
  private async loadScene(
    onProgress?: (progress: number, stage: string) => void
  ): Promise<void> {
    console.log("🎬 Этап 1: Загрузка сцены");
    
    // 0-5%: Создание фона
    this.updateProgress(0.02, "Создание фона...", onProgress);
    await this._backgroundManager.initialize();
    
    // 5-10%: Создание освещения
    this.updateProgress(0.05, "Настройка освещения...", onProgress);
    this._lightingManager.initialize();
    
    // 10-15%: Создание сетки
    this.updateProgress(0.10, "Создание сетки...", onProgress);
    this._gridManager.initialize();
    
    // 15-20%: Инициализация камеры (без анимации)
    this.updateProgress(0.15, "Настройка камеры...", onProgress);
    
    console.log("✅ Этап 1 завершён");
  }

  /**
   * ЭТАП 2: Загрузка здания (20-70%)
   */
  private async loadBuilding(
    modelUrl: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<void> {
    console.log("🏗 Этап 2: Загрузка здания");
    
    await this._buildingManager.loadBuilding(modelUrl, (fileProgress) => {
      // Прогресс от 0.2 до 0.7
      const totalProgress = 0.2 + (fileProgress * 0.5);
      this.updateProgress(totalProgress, "Загрузка модели здания...", onProgress);
    });
    
    // Получаем границы здания для камеры
    const bounds = this.calculateBuildingBounds();
    this._cameraManager.setBuildingBounds(bounds);
    
    console.log("✅ Этап 2 завершён");
  }

  /**
   * ЭТАП 3: Создание маркеров (70-90%)
   */
  private async loadMarkers(
    onProgress?: (progress: number, stage: string) => void
  ): Promise<void> {
    console.log("📍 Этап 3: Создание маркеров");
    
    // 70-75%: Инициализация менеджера маркеров
    this.updateProgress(0.70, "Инициализация маркеров...", onProgress);
    
    // 75-85%: Создание тестовых маркеров
    this.updateProgress(0.75, "Создание маркеров...", onProgress);
    this._markerManager.createTestMarkers();
    
    // 85-90%: Настройка маркеров
    this.updateProgress(0.85, "Настройка маркеров...", onProgress);
    
    console.log("✅ Этап 3 завершён");
  }

  /**
   * ФИНАЛИЗАЦИЯ (90-100%)
   */
  private async finalize(
    onProgress?: (progress: number, stage: string) => void
  ): Promise<void> {
    console.log("✨ Финализация");
    
    // 90-95%: Подготовка к анимации
    this.updateProgress(0.90, "Подготовка к анимации...", onProgress);
    
    // 95-100%: Готово
    this.updateProgress(0.95, "Готово!", onProgress);
    
    // Небольшая задержка для визуального эффекта
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.updateProgress(1.0, "Загрузка завершена!", onProgress);
  }

  /**
   * Обновление прогресса
   */
  private updateProgress(
    progress: number,
    stage: string,
    onProgress?: (progress: number, stage: string) => void
  ): void {
    this._loadingProgress = progress;
    this._loadingStage = stage;
    if (onProgress) {
      onProgress(progress, stage);
    }
  }

  /**
   * Показать сцену с анимацией камеры
   */
  public async showScene(): Promise<void> {
    console.log("🎬 Запуск анимации камеры");
    await this._cameraManager.initialize();
    console.log("✅ Сцена готова");
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

  /**
   * Рендер сцены с учётом времени кадра
   * @param deltaTime - время с прошлого кадра в секундах
   */
  public render(deltaTime: number): void {
    if (this._cameraManager.camera) {
      this._markerManager.update(this._cameraManager.camera.position);
    }
    
    // Обновляем менеджеры, которым нужно обновление по времени
    if (this._backgroundManager) {
      this._backgroundManager.update(deltaTime);
    }
    
    if (this._lightingManager) {
      this._lightingManager.update(deltaTime);
    }
    
    if (this._gridManager) {
      this._gridManager.update(deltaTime);
    }
    
    this._scene.render();
  }

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

  public get markerManager(): MarkerManager {
    return this._markerManager;
  }

  public get isLoading(): boolean {
    return this._isLoading;
  }

  public get loadingStage(): string {
    return this._loadingStage;
  }

  public get loadingProgress(): number {
    return this._loadingProgress;
  }
}