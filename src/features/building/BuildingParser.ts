import { AbstractMesh, TransformNode } from "@babylonjs/core";
import { BuildingElement, ElementType } from "./types";

export interface ParseResult {
  elements: Map<string, BuildingElement>;
  floors: Map<number, BuildingElement[]>;
  walls: BuildingElement[];
  windows: BuildingElement[];
  doors: BuildingElement[];
  stairs: BuildingElement[];
  floorNodes: Map<number, TransformNode>;
}

export class BuildingParser {
  /**
   * Парсинг всех мешей и классификация по типам
   */
  public parseMeshes(meshes: AbstractMesh[]): ParseResult {
    console.log("🔍 Начинаю парсинг мешей...");
    console.log(`  - Всего мешей: ${meshes.length}`);
    
    const elements = new Map<string, BuildingElement>();
    const floors = new Map<number, BuildingElement[]>();
    const floorNodes = new Map<number, TransformNode>();
    const walls: BuildingElement[] = [];
    const windows: BuildingElement[] = [];
    const doors: BuildingElement[] = [];
    const stairs: BuildingElement[] = [];

    // Сначала находим все ноды этажей
    meshes.forEach(mesh => {
      if (mesh.name.startsWith("SM_Floor_")) {
        const floorNumber = this.extractFloorNumber(mesh.name, 'floor');
        if (floorNumber && mesh instanceof TransformNode) {
          floorNodes.set(floorNumber, mesh);
          console.log(`  📍 Найдена нода этажа ${floorNumber}: ${mesh.name}`);
        }
      }
    });

    console.log(`  - Найдено нод этажей: ${floorNodes.size}`);

    // Затем обрабатываем все меши
    this.processMeshesRecursively(
      meshes, 
      elements, 
      floors, 
      floorNodes,
      walls, 
      windows, 
      doors, 
      stairs
    );

    console.log(`✅ Парсинг завершён:`);
    console.log(`  - Элементов: ${elements.size}`);
    console.log(`  - Этажей в floors: ${floors.size}`);
    console.log(`  - Нод этажей: ${floorNodes.size}`);
    console.log(`  - Стен: ${walls.length}`);

    return {
      elements,
      floors,
      floorNodes,
      walls,
      windows,
      doors,
      stairs
    };
  }

  private processMeshesRecursively(
    meshes: AbstractMesh[],
    elements: Map<string, BuildingElement>,
    floors: Map<number, BuildingElement[]>,
    floorNodes: Map<number, TransformNode>,
    walls: BuildingElement[],
    windows: BuildingElement[],
    doors: BuildingElement[],
    stairs: BuildingElement[]
  ): void {
    meshes.forEach(mesh => {
      // Определяем тип элемента
      const type = this.determineElementType(mesh.name);
      
      // Определяем этаж через родителя
      let floorNumber: number | undefined = undefined;
      let parentFloorNode: TransformNode | undefined = undefined;
      
      // Ищем родителя - этаж
      let parent = mesh.parent;
      while (parent) {
        if (parent.name.startsWith("SM_Floor_")) {
          floorNumber = this.extractFloorNumber(parent.name, 'floor');
          parentFloorNode = parent instanceof TransformNode ? parent : undefined;
          break;
        }
        parent = parent.parent;
      }

      // Если не нашли родителя, пробуем извлечь из имени
      if (floorNumber === undefined) {
        floorNumber = this.extractFloorNumber(mesh.name, type);
      }

      // Для самих этажей
      if (type === 'floor') {
        floorNumber = this.extractFloorNumber(mesh.name, 'floor');
      }

      // ВАЖНО: Назначаем renderingGroupId
      // 0 - непрозрачные объекты (этажи, пол, потолок)
      // 1 - прозрачные объекты (стены в прозрачном режиме)
      if (type === 'floor') {
        mesh.renderingGroupId = 0; // Непрозрачные
      } else if (type === 'wall') {
        mesh.renderingGroupId = 1; // Прозрачные (будет меняться)
      } else {
        mesh.renderingGroupId = 0; // По умолчанию непрозрачные
      }

      const element: BuildingElement = {
        name: mesh.name,
        mesh: mesh,
        type: type,
        floorNumber: floorNumber,
        isVisible: false,
        originalMaterial: mesh.material,
        originalPosition: mesh.position.clone(),
        originalRotation: mesh.rotation.clone(),
        originalScaling: mesh.scaling.clone(),
        renderingGroupId: mesh.renderingGroupId // Сохраняем группу
      };

      elements.set(mesh.name, element);

      // Группируем по типам
      switch (type) {
        case 'floor':
          if (floorNumber) {
            if (!floors.has(floorNumber)) {
              floors.set(floorNumber, []);
            }
            floors.get(floorNumber)!.push(element);
          }
          break;
        case 'wall':
          walls.push(element);
          break;
        case 'window':
          windows.push(element);
          break;
        case 'door':
          doors.push(element);
          break;
        case 'stair':
          stairs.push(element);
          break;
        default:
          break;
      }

      // По умолчанию скрываем все элементы
      mesh.isVisible = false;

      // Рекурсивно обрабатываем дочерние меши
      if (mesh.getChildMeshes) {
        this.processMeshesRecursively(
          mesh.getChildMeshes(),
          elements,
          floors,
          floorNodes,
          walls,
          windows,
          doors,
          stairs
        );
      }
    });
  }

  /**
   * Определение типа элемента по имени
   */
  private determineElementType(name: string): ElementType {
    if (name.startsWith("SM_Floor_")) return 'floor';
    if (name.startsWith("SM_Wall_")) return 'wall';
    if (name.startsWith("SM_Window_")) return 'window';
    if (name.startsWith("SM_Door_")) return 'door';
    if (name.startsWith("SM_Stair_")) return 'stair';
    
    if (name.includes("SM_Wall_")) return 'wall';
    if (name.includes("Window")) return 'window';
    if (name.includes("Door")) return 'door';
    if (name.includes("Stair")) return 'stair';
    
    return 'other';
  }

  /**
   * Извлечение номера этажа из имени
   */
  private extractFloorNumber(name: string, type: ElementType): number | undefined {
    if (type === 'floor') {
      const floorPattern = /SM_Floor_(\d+)/;
      const match = name.match(floorPattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    
    if (type === 'wall') {
      const wallPattern = /SM_Wall_(\d+)/;
      const match = name.match(wallPattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    
    if (type === 'window' || type === 'door' || type === 'stair') {
      const pattern = new RegExp(`SM_${type.charAt(0).toUpperCase() + type.slice(1)}_(\\d+)`, 'i');
      const match = name.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    
    const universalPattern = /_(\d+)(?:_|\.|$)/;
    const universalMatch = name.match(universalPattern);
    if (universalMatch && universalMatch[1]) {
      return parseInt(universalMatch[1], 10);
    }
    
    return undefined;
  }
}