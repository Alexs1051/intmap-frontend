import { Scene } from "@babylonjs/core";
import { BuildingLoader } from "./BuildingLoader";
import { BuildingParser } from "./BuildingParser";
import { BuildingData, BuildingElement } from "./types";
import { FloorManager } from "./FloorManager";
import { WallManager } from "./WallManager";

export class BuildingManager {
  private static _instance: BuildingManager;
  private _scene: Scene;
  private _loader: BuildingLoader;
  private _parser: BuildingParser;
  private _data: BuildingData | null = null;
  
  // Менеджеры
  private _floorManager: FloorManager;
  private _wallManager: WallManager;

  private constructor(scene: Scene) {
    this._scene = scene;
    this._loader = new BuildingLoader(scene);
    this._parser = new BuildingParser();
    
    // Инициализируем дочерние менеджеры (пока без данных)
    this._floorManager = FloorManager.getInstance(scene);
    this._wallManager = WallManager.getInstance(scene);
  }

  public static getInstance(scene: Scene): BuildingManager {
    if (!BuildingManager._instance) {
      BuildingManager._instance = new BuildingManager(scene);
    }
    return BuildingManager._instance;
  }

  /**
   * Загрузка модели здания
   */
  public async loadBuilding(modelUrl: string): Promise<void> {
    try {
      console.log("🏗 Загрузка здания...");
      
      const loadResult = await this._loader.loadModel(modelUrl);
      this._data = this._parser.parseMeshes(loadResult.meshes);
      
      // Инициализируем менеджеры
      this.initializeManagers();
      
      console.log(`✅ Здание загружено. Элементов: ${this._data.elements.size}`);
      
      // Показываем всё здание при загрузке
      this._floorManager.showAllFloors();

    } catch (error) {
      console.error("❌ Ошибка загрузки здания:", error);
    }
  }

  /**
   * Инициализация менеджеров данными
   */
  private initializeManagers(): void {
    if (!this._data) {
      console.warn("⚠️ Нет данных для инициализации");
      return;
    }

    console.log("🏗 Инициализация менеджеров...");
    console.log(`  - Всего элементов: ${this._data.elements.size}`);
    console.log(`  - Найдено этажей в _data.floors: ${this._data.floors.size}`);
    console.log(`  - Найдено нод этажей: ${this._data.floorNodes.size}`);

    // 1. Сначала добавляем этажи
    let floorsAdded = 0;
    this._data.floors.forEach((elements, floorNumber) => {
      console.log(`  → Обработка этажа ${floorNumber}, элементов: ${elements.length}`);
      
      // Получаем родительскую ноду
      const floorNode = this._data?.floorNodes.get(floorNumber);
      
      // Добавляем каждый элемент этажа
      elements.forEach(element => {
        // Важно: передаём и элемент, и ноду
        this._floorManager.addFloor(element, floorNode);
      });
      
      floorsAdded++;
    });

    // 2. Добавляем стены
    let wallsAdded = 0;
    this._data.walls.forEach(element => {
      this._wallManager.addWall(element);
      wallsAdded++;
    });

    console.log(`✅ Менеджеры инициализированы. Добавлено этажей: ${floorsAdded}, стен: ${wallsAdded}`);
    
    // 3. Проверяем, что добавилось в FloorManager
    console.log(`  → FloorManager содержит этажей: ${this._floorManager.floorCount}`);
  }

  /**
   * Перезагрузка модели (если нужно сменить здание)
   */
  public async reloadBuilding(modelUrl: string): Promise<void> {
    // Очищаем старые данные
    this._loader.unloadModel();
    this._data = null;
    
    // Загружаем новую модель
    await this.loadBuilding(modelUrl);
  }

  /**
   * Получить элемент по имени
   */
  public getElement(name: string): BuildingElement | undefined {
    return this._data?.elements.get(name);
  }

  /**
   * Получить все элементы определённого типа
   */
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
}