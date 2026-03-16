import { Scene, TransformNode, AbstractMesh } from "@babylonjs/core";
import { BuildingElement, FloorData } from "./types";
import { WallManager } from "./WallManager";

export class FloorManager {
  private static _instance: FloorManager;
  private _scene: Scene;
  private _floors: Map<number, FloorData> = new Map();
  private _floorNodes: Map<number, TransformNode> = new Map();
  private _currentFloor: number = 1;
  private _wallManager: WallManager;

  private constructor(scene: Scene) {
    this._scene = scene;
    this._wallManager = WallManager.getInstance(scene);
  }

  public static getInstance(scene: Scene): FloorManager {
    if (!FloorManager._instance) {
      FloorManager._instance = new FloorManager(scene);
    }
    return FloorManager._instance;
  }

  /**
   * Добавить этаж
   */
  public addFloor(element: BuildingElement, floorNode?: TransformNode): void {
    const floorNumber = element.floorNumber;
    if (!floorNumber) {
      console.warn(`⚠️ Элемент ${element.name} не имеет номера этажа`);
      return;
    }

    console.log(`    🏗 Добавление элемента ${element.name} на этаж ${floorNumber}`);

    if (!this._floors.has(floorNumber)) {
      this._floors.set(floorNumber, {
        number: floorNumber,
        elements: [],
        isVisible: false
      });
    }

    element.mesh.renderingGroupId = 0;
    
    // Сохраняем оригинальную позицию
    if (!element.mesh.metadata) element.mesh.metadata = {};
    element.mesh.metadata.originalPosition = element.mesh.position.clone();
    
    this._floors.get(floorNumber)!.elements.push(element);
    
    if (floorNode && !this._floorNodes.has(floorNumber)) {
      this._floorNodes.set(floorNumber, floorNode);
      floorNode.setEnabled(true);
    }
  }

  /**
   * Показать конкретный этаж
   */
  public showFloor(floorNumber: number): void {
    console.log(`📌 Показать этаж ${floorNumber}`);

    // 1. Сначала показываем всё (все ноды включены)
    this._floorNodes.forEach((node) => {
      node.setEnabled(true);
    });

    // 2. Скрываем стены других этажей через WallManager
    // Показываем стены только текущего этажа
    this._wallManager.showWallsForFloor(floorNumber);

    // 3. Для не-стен (пол, потолок) используем старую логику
    this._floors.forEach((floor, num) => {
      floor.elements.forEach(element => {
        // Не трогаем стены - они уже обработаны WallManager
        if (element.type !== 'wall') {
          element.mesh.isVisible = (num === floorNumber);
          element.isVisible = (num === floorNumber);
        }
      });
    });
    
    this._currentFloor = floorNumber;
    console.log(`✅ Показан этаж ${floorNumber}`);
  }

  /**
   * Показать все этажи
   */
  public showAllFloors(): void {
    console.log(`🏢 Показываю все этажи`);
    
    // 1. Включаем все родительские ноды
    this._floorNodes.forEach((node) => {
      node.setEnabled(true);
    });

    // 2. Показываем все стены через WallManager
    this._wallManager.showAllWalls();

    // 3. Показываем все остальные элементы
    this._floors.forEach(floor => {
      floor.elements.forEach(element => {
        element.mesh.setEnabled(true);
        element.mesh.isVisible = true;
        element.isVisible = true;
      });
    });
  }

  /**
   * Скрыть все этажи
   */
  public hideAllFloors(): void {
    // Не отключаем ноды! Просто скрываем всё через видимость
    this._floors.forEach(floor => {
      floor.elements.forEach(element => {
        element.mesh.isVisible = false;
        element.isVisible = false;
      });
    });
  }

  // Геттеры
  public get currentFloor(): number {
    return this._currentFloor;
  }

  public get floorCount(): number {
    return this._floors.size;
  }

  public get floors(): Map<number, FloorData> {
    return this._floors;
  }
}