import { Scene, Vector3 } from "@babylonjs/core";
import { BuildingLoader } from "./BuildingLoader";
import { BuildingParser } from "./BuildingParser";
import { BuildingData, BuildingElement } from "./types";
import { FloorManager } from "./FloorManager";
import { WallManager } from "./WallManager";
import { BuildingAnimator } from "./BuildingAnimator";
import { BuildingDimensions } from "../camera/types";
import { logger } from "../../core/logger/Logger";

const buildingLogger = logger.getLogger('BuildingManager');

export class BuildingManager {
  private static _instance: BuildingManager;
  private _scene: Scene;
  private _loader: BuildingLoader;
  private _parser: BuildingParser;
  private _data: BuildingData | null = null;
  
  private readonly _floorManager: FloorManager;
  private readonly _wallManager: WallManager;
  private readonly _animator: BuildingAnimator;

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

  public async loadBuilding(
    modelUrl: string, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      buildingLogger.info(`Загрузка здания: ${modelUrl}`);
      
      onProgress?.(0.1);
      
      const loadResult = await this._loader.loadModel(modelUrl, (p) => 
        onProgress?.(0.1 + p * 0.3)
      );
      
      onProgress?.(0.4);
      this._data = this._parser.parseMeshes(loadResult.meshes);
      
      onProgress?.(0.6);
      this.initializeManagers();
      
      this._floorManager.showAllFloors();
      onProgress?.(1.0);
      
      buildingLogger.info(`Здание загружено. Элементов: ${this._data.elements.size}`);
    } catch (error) {
      buildingLogger.error("Ошибка загрузки здания", error);
      throw error;
    }
  }

  public async animateConstruction(): Promise<void> {
    if (!this._data) {
      buildingLogger.warn("Нет данных для анимации");
      return;
    }

    buildingLogger.info("Запуск анимации строительства");

    this._data.elements.forEach(element => {
      if (!element.mesh.metadata) element.mesh.metadata = {};
      element.mesh.metadata.originalPosition = element.mesh.position.clone();
    });

    const wallsByFloor = this.groupWallsByFloor();
    await this._animator.animateConstruction(this._data.floors, wallsByFloor);
    
    buildingLogger.info("Анимация строительства завершена");
  }

  private groupWallsByFloor(): Map<number, BuildingElement[]> {
    const wallsByFloor = new Map<number, BuildingElement[]>();
    
    this._data?.walls.forEach(wall => {
      if (wall.floorNumber) {
        const walls = wallsByFloor.get(wall.floorNumber) || [];
        walls.push(wall);
        wallsByFloor.set(wall.floorNumber, walls);
      }
    });
    
    return wallsByFloor;
  }

  private initializeManagers(): void {
    if (!this._data) return;

    buildingLogger.debug("Инициализация менеджеров");

    this._data.floors.forEach((elements, floorNumber) => {
      const floorNode = this._data?.floorNodes.get(floorNumber);
      elements.forEach(element => this._floorManager.addFloor(element, floorNode));
    });

    this._data.walls.forEach(element => this._wallManager.addWall(element));

    buildingLogger.info(`Менеджеры инициализированы. Этажей: ${this._floorManager.floorCount}, стен: ${this._wallManager.count}`);
  }

  public getBuildingDimensions(): BuildingDimensions {
    if (!this._data) {
      return { height: 30, width: 30, depth: 30 };
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    this._data.elements.forEach(element => {
      const bbox = element.mesh.getBoundingInfo();
      minX = Math.min(minX, bbox.boundingBox.minimum.x);
      maxX = Math.max(maxX, bbox.boundingBox.maximum.x);
      minY = Math.min(minY, bbox.boundingBox.minimum.y);
      maxY = Math.max(maxY, bbox.boundingBox.maximum.y);
      minZ = Math.min(minZ, bbox.boundingBox.minimum.z);
      maxZ = Math.max(maxZ, bbox.boundingBox.maximum.z);
    });
    
    const dimensions = {
      height: Math.max(10, maxY - minY),
      width: Math.max(10, maxX - minX),
      depth: Math.max(10, maxZ - minZ)
    };
    
    buildingLogger.debug(`Размеры здания: ${JSON.stringify(dimensions)}`);
    return dimensions;
  }

  public getBuildingCenter(): Vector3 {
    if (!this._data) return Vector3.Zero();
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    this._data.elements.forEach(element => {
      const bbox = element.mesh.getBoundingInfo();
      minX = Math.min(minX, bbox.boundingBox.minimum.x);
      maxX = Math.max(maxX, bbox.boundingBox.maximum.x);
      minY = Math.min(minY, bbox.boundingBox.minimum.y);
      maxY = Math.max(maxY, bbox.boundingBox.maximum.y);
      minZ = Math.min(minZ, bbox.boundingBox.minimum.z);
      maxZ = Math.max(maxZ, bbox.boundingBox.maximum.z);
    });
    
    return new Vector3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    );
  }

  public getBuildingHeight(): number {
    return this.getBuildingDimensions().height;
  }

  public getBuildingWidth(): number {
    return this.getBuildingDimensions().width;
  }

  public getBuildingDepth(): number {
    return this.getBuildingDimensions().depth;
  }

  public async reloadBuilding(modelUrl: string, onProgress?: (progress: number) => void): Promise<void> {
    this._loader.unloadModel();
    
    if (this._data) {
      this._animator.resetAllElements(Array.from(this._data.elements.values()));
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