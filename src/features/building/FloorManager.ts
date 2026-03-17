import { Scene, TransformNode } from "@babylonjs/core";
import { BuildingElement, FloorData } from "./types";
import { WallManager } from "./WallManager";
import { logger } from "../../core/logger/Logger";

const floorLogger = logger.getLogger('FloorManager');

export class FloorManager {
  private static _instance: FloorManager;
  private readonly _floors: Map<number, FloorData> = new Map();
  private readonly _floorNodes: Map<number, TransformNode> = new Map();
  private _currentFloor: number = 1;
  private _wallManager: WallManager;

  private constructor(private readonly _scene: Scene) {
    this._wallManager = WallManager.getInstance(_scene);
  }

  public static getInstance(scene: Scene): FloorManager {
    if (!FloorManager._instance) {
      FloorManager._instance = new FloorManager(scene);
    }
    return FloorManager._instance;
  }

  public addFloor(element: BuildingElement, floorNode?: TransformNode): void {
    const floorNumber = element.floorNumber;
    if (!floorNumber) {
      floorLogger.warn(`Элемент ${element.name} не имеет номера этажа`);
      return;
    }

    if (!this._floors.has(floorNumber)) {
      this._floors.set(floorNumber, {
        number: floorNumber,
        elements: [],
        isVisible: false
      });
    }

    element.mesh.renderingGroupId = 0;
    element.mesh.metadata ??= {};
    element.mesh.metadata.originalPosition = element.mesh.position.clone();
    
    this._floors.get(floorNumber)!.elements.push(element);
    
    if (floorNode && !this._floorNodes.has(floorNumber)) {
      this._floorNodes.set(floorNumber, floorNode);
      floorNode.setEnabled(true);
    }
    
    floorLogger.debug(`Добавлен этаж ${floorNumber}, всего этажей: ${this._floors.size}`);
  }

  public showFloor(floorNumber: number): void {
    if (!this._floors.has(floorNumber)) {
      floorLogger.warn(`Этаж ${floorNumber} не существует. Доступны: ${this.getFloorNumbers().join(', ')}`);
      return;
    }

    floorLogger.debug(`Показать этаж ${floorNumber}`);

    this._floorNodes.forEach(node => node.setEnabled(true));
    this._wallManager.showWallsForFloor(floorNumber);

    this._floors.forEach((floor, num) => {
      const visible = num === floorNumber;
      floor.elements.forEach(element => {
        if (element.type !== 'wall') {
          element.mesh.isVisible = visible;
          element.isVisible = visible;
        }
      });
      floor.isVisible = visible;
    });
    
    this._currentFloor = floorNumber;
  }

  public showAllFloors(): void {
    floorLogger.debug("Показать все этажи");
    
    this._floorNodes.forEach(node => node.setEnabled(true));
    this._wallManager.showAllWalls();

    this._floors.forEach(floor => {
      floor.elements.forEach(element => {
        element.mesh.setEnabled(true);
        element.mesh.isVisible = true;
        element.isVisible = true;
      });
      floor.isVisible = true;
    });
  }

  public hideAllFloors(): void {
    this._floors.forEach(floor => {
      floor.elements.forEach(element => {
        element.mesh.isVisible = false;
        element.isVisible = false;
      });
      floor.isVisible = false;
    });
  }

  public getFloorNumbers(): number[] {
    return Array.from(this._floors.keys()).sort((a, b) => a - b);
  }

  public get minFloor(): number {
    const floors = this.getFloorNumbers();
    return floors.length > 0 ? floors[0] : 1;
  }

  public get maxFloor(): number {
    const floors = this.getFloorNumbers();
    return floors.length > 0 ? floors[floors.length - 1] : 1;
  }

  public hasFloor(floorNumber: number): boolean {
    return this._floors.has(floorNumber);
  }

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