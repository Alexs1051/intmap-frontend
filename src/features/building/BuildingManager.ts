import { Scene } from "@babylonjs/core";
import { BuildingLoader } from "./BuildingLoader";
import { BuildingParser } from "./BuildingParser";
import { BuildingData, BuildingElement } from "./types";
import { FloorManager } from "./FloorManager";
import { WallManager } from "./WallManager";
import { BuildingAnimator } from "./BuildingAnimator";

export class BuildingManager {
  private static _instance: BuildingManager;
  private _scene: Scene;
  private _loader: BuildingLoader;
  private _parser: BuildingParser;
  private _data: BuildingData | null = null;
  
  // Менеджеры
  private _floorManager: FloorManager;
  private _wallManager: WallManager;
  private _animator: BuildingAnimator;

  private constructor(scene: Scene) {
    this._scene = scene;
    this._loader = new BuildingLoader(scene);
    this._parser = new BuildingParser();
    
    this._floorManager = FloorManager.getInstance(scene);
    this._wallManager = WallManager.getInstance(scene);
    this._animator = new BuildingAnimator(scene);
  }

  public static getInstance(scene: Scene): BuildingManager {
    if (!BuildingManager._instance) {
      BuildingManager._instance = new BuildingManager(scene);
    }
    return BuildingManager._instance;
  }

  /**
   * Загрузка модели здания с прогрессом (без анимации)
   */
  public async loadBuilding(
    modelUrl: string, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      console.log("🏗 Загрузка здания...");
      
      if (onProgress) onProgress(0.1);
      
      const loadResult = await this._loader.loadModel(modelUrl, (fileProgress) => {
        if (onProgress) onProgress(0.1 + fileProgress * 0.3);
      });
      
      if (onProgress) onProgress(0.4);
      this._data = this._parser.parseMeshes(loadResult.meshes);
      
      if (onProgress) onProgress(0.6);
      this.initializeManagers();
      
      // ВАЖНО: Сразу показываем всё здание (без анимации)
      this._floorManager.showAllFloors();
      
      if (onProgress) onProgress(1.0);
      
      console.log(`✅ Здание загружено. Элементов: ${this._data.elements.size}`);

    } catch (error) {
      console.error("❌ Ошибка загрузки здания:", error);
      throw error;
    }
  }

  /**
   * Анимация строительства (запускается отдельно)
   */
  public async animateConstruction(): Promise<void> {
    if (!this._data) {
      console.warn("⚠️ Нет данных для анимации");
      return;
    }

    console.log("🎬 Запуск анимации строительства...");

    // Сохраняем текущие позиции как оригинальные
    this._data.elements.forEach(element => {
      if (!element.mesh.metadata) element.mesh.metadata = {};
      element.mesh.metadata.originalPosition = element.mesh.position.clone();
    });

    // Группируем стены по этажам
    const wallsByFloor = new Map<number, BuildingElement[]>();
    this._data.walls.forEach(wall => {
      if (wall.floorNumber) {
        if (!wallsByFloor.has(wall.floorNumber)) {
          wallsByFloor.set(wall.floorNumber, []);
        }
        wallsByFloor.get(wall.floorNumber)!.push(wall);
      }
    });

    // Запускаем анимацию (элементы уже видимы, аниматор сам их поднимет и опустит)
    await this._animator.animateConstruction(
      this._data.floors,
      wallsByFloor
    );

    console.log("✅ Анимация строительства завершена");
  }

  private initializeManagers(): void {
    if (!this._data) return;

    console.log("🏗 Инициализация менеджеров...");

    this._data.floors.forEach((elements, floorNumber) => {
      const floorNode = this._data?.floorNodes.get(floorNumber);
      elements.forEach(element => {
        this._floorManager.addFloor(element, floorNode);
      });
    });

    this._data.walls.forEach(element => {
      this._wallManager.addWall(element);
    });

    console.log(`✅ Менеджеры инициализированы. Этажей: ${this._floorManager.floorCount}, стен: ${this._wallManager.count}`);
  }

  public async reloadBuilding(modelUrl: string, onProgress?: (progress: number) => void): Promise<void> {
    this._loader.unloadModel();
    
    if (this._data) {
      const allElements = Array.from(this._data.elements.values());
      this._animator.resetAllElements(allElements);
    }
    
    this._data = null;
    await this.loadBuilding(modelUrl, onProgress);
  }

  public getElement(name: string): BuildingElement | undefined {
    return this._data?.elements.get(name);
  }

  public getElementsByType(type: string): BuildingElement[] {
    if (!this._data) return [];
    return Array.from(this._data.elements.values()).filter(el => el.type === type);
  }

  // Геттеры
  public get isLoaded(): boolean {
    return this._data !== null;
  }

  public get floorManager(): FloorManager {
    return this._floorManager;
  }

  public get wallManager(): WallManager {
    return this._wallManager;
  }

  public get data(): BuildingData | null {
    return this._data;
  }

  public get animator(): BuildingAnimator {
    return this._animator;
  }
}