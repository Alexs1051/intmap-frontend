import { AbstractMesh, TransformNode } from "@babylonjs/core";
import { BuildingElement, ElementType, ParseResult } from "./types";
import { logger } from "../../core/logger/Logger";

const parserLogger = logger.getLogger('BuildingParser');

export class BuildingParser {
  public parseMeshes(meshes: AbstractMesh[]): ParseResult {
    parserLogger.debug(`Парсинг ${meshes.length} мешей`);

    const elements = new Map<string, BuildingElement>();
    const floors = new Map<number, BuildingElement[]>();
    const floorNodes = new Map<number, TransformNode>();
    const walls: BuildingElement[] = [];
    const windows: BuildingElement[] = [];
    const doors: BuildingElement[] = [];
    const stairs: BuildingElement[] = [];

    this.findFloorNodes(meshes, floorNodes);
    this.processMeshes(meshes, {
      elements, floors, floorNodes, walls, windows, doors, stairs
    });

    parserLogger.info(`Парсинг завершён: ${elements.size} элементов, ${floors.size} этажей, ${walls.length} стен`);
    
    return { elements, floors, floorNodes, walls, windows, doors, stairs };
  }

  private findFloorNodes(meshes: AbstractMesh[], floorNodes: Map<number, TransformNode>): void {
    meshes.forEach(mesh => {
      if (mesh.name.startsWith("SM_Floor_")) {
        const floorNum = this.extractFloorNumber(mesh.name);
        if (floorNum && mesh instanceof TransformNode) {
          floorNodes.set(floorNum, mesh);
          parserLogger.debug(`Найдена нода этажа ${floorNum}: ${mesh.name}`);
        }
      }
    });
  }

  private processMeshes(
    meshes: AbstractMesh[],
    containers: {
      elements: Map<string, BuildingElement>;
      floors: Map<number, BuildingElement[]>;
      floorNodes: Map<number, TransformNode>;
      walls: BuildingElement[];
      windows: BuildingElement[];
      doors: BuildingElement[];
      stairs: BuildingElement[];
    }
  ): void {
    meshes.forEach(mesh => {
      const type = this.determineType(mesh.name);
      const floorNum = this.findFloorNumber(mesh);
      
      mesh.renderingGroupId = type === 'wall' ? 1 : 0;

      const element: BuildingElement = {
        name: mesh.name,
        mesh,
        type,
        floorNumber: floorNum,
        isVisible: false,
        originalMaterial: mesh.material,
        originalPosition: mesh.position.clone(),
        originalRotation: mesh.rotation.clone(),
        originalScaling: mesh.scaling.clone(),
        renderingGroupId: mesh.renderingGroupId
      };

      containers.elements.set(mesh.name, element);
      this.categorizeElement(element, containers);
      mesh.isVisible = false;

      if (mesh.getChildMeshes) {
        this.processMeshes(mesh.getChildMeshes(), containers);
      }
    });
  }

  private findFloorNumber(mesh: AbstractMesh): number | undefined {
    let parent = mesh.parent;
    while (parent) {
      if (parent.name.startsWith("SM_Floor_")) {
        return this.extractFloorNumber(parent.name);
      }
      parent = parent.parent;
    }
    return this.extractFloorNumber(mesh.name);
  }

  private determineType(name: string): ElementType {
    if (name.startsWith("SM_Floor_")) return 'floor';
    if (name.startsWith("SM_Wall_")) return 'wall';
    if (name.startsWith("SM_Window_")) return 'window';
    if (name.startsWith("SM_Door_")) return 'door';
    if (name.startsWith("SM_Stair_")) return 'stair';
    
    if (name.includes("Window")) return 'window';
    if (name.includes("Door")) return 'door';
    if (name.includes("Stair")) return 'stair';
    if (name.includes("Wall")) return 'wall';
    
    return 'other';
  }

  private extractFloorNumber(name: string): number | undefined {
    const match = name.match(/_(\d+)(?:_|\.|$)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private categorizeElement(
    element: BuildingElement,
    containers: {
      floors: Map<number, BuildingElement[]>;
      walls: BuildingElement[];
      windows: BuildingElement[];
      doors: BuildingElement[];
      stairs: BuildingElement[];
    }
  ): void {
    switch (element.type) {
      case 'floor':
        if (element.floorNumber) {
          const floorElements = containers.floors.get(element.floorNumber) || [];
          floorElements.push(element);
          containers.floors.set(element.floorNumber, floorElements);
        }
        break;
      case 'wall':
        containers.walls.push(element);
        break;
      case 'window':
        containers.windows.push(element);
        break;
      case 'door':
        containers.doors.push(element);
        break;
      case 'stair':
        containers.stairs.push(element);
        break;
    }
  }
}