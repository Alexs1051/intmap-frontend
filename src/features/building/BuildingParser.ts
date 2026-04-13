import { AbstractMesh, TransformNode } from "@babylonjs/core";
import { injectable } from "inversify";
import { Logger } from "../../core/logger/Logger";
import { BuildingElement, ElementType, BuildingParseResult } from "../../shared/types";
import { BUILDING_PARSER } from "../../shared/constants";
import { IBuildingParser } from "@shared/interfaces";
import { MarkerParser } from './MarkerParser';

/**
 * Парсер загруженной GLB модели здания
 * Разбирает меши на элементы: этажи, стены, окна, двери, лестницы, маркеры, комнаты
 */
@injectable()
export class BuildingParser implements IBuildingParser {
    private logger: Logger;
    private config = BUILDING_PARSER;
    private markerParser: MarkerParser;

    constructor() {
        this.logger = Logger.getInstance().getLogger('BuildingParser');
        this.markerParser = new MarkerParser();
    }

    public parseMeshes(loadResult: { meshes: AbstractMesh[]; transformNodes: TransformNode[]; rootMesh: AbstractMesh | null }): BuildingParseResult {
        const allObjects: (AbstractMesh | TransformNode)[] = [
            ...loadResult.meshes,
            ...loadResult.transformNodes
        ];

        const result: BuildingParseResult = {
            elements: new Map(),
            floors: new Map(),
            floorNodes: new Map(),
            walls: [],
            windows: [],
            doors: [],
            stairs: [],
            rooms: new Map(),
            markers: new Map()
        };

        // 1. Находим все ноды этажей
        this.findFloorNodes(allObjects, result.floorNodes);

        // 2. Создаём карту этажей для всех объектов
        const floorNodeMap = new Map<AbstractMesh | TransformNode, number>();
        result.floorNodes.forEach((node, floorNum) => {
            floorNodeMap.set(node, floorNum);
        });

        // 3. Обрабатываем строительные элементы
        this.processMeshes(allObjects, result, floorNodeMap);

        // 4. Парсим маркеры и комнаты
        const { markers, rooms } = this.markerParser.parseMarkersAndRooms(allObjects, floorNodeMap);
        result.markers = markers;
        result.rooms = rooms;

        this.logger.info(`Parsed: ${result.elements.size} elements, ${result.floors.size} floors, ${result.walls.length} walls, ${result.markers.size} markers, ${result.rooms.size} rooms`);

        return result;
    }

    /**
     * Найти TransformNode этажей по префиксу
     */
    private findFloorNodes(objects: (AbstractMesh | TransformNode)[], floorNodes: Map<number, TransformNode>): void {
        objects.forEach(obj => {
            if (obj.name.startsWith(this.config.FLOOR_PREFIX) && obj instanceof TransformNode) {
                const floorNum = this.extractFloorNumber(obj.name);
                if (floorNum !== null) {
                    floorNodes.set(floorNum, obj);
                }
            }
        });
    }

    /**
     * Обработать меши и распределить по категориям
     */
    private processMeshes(
        objects: (AbstractMesh | TransformNode)[],
        result: BuildingParseResult,
        floorNodeMap: Map<AbstractMesh | TransformNode, number>
    ): void {
        objects.forEach(obj => {
            const isFloorGroup = obj.name.startsWith(this.config.FLOOR_PREFIX) && obj instanceof TransformNode;

            if (isFloorGroup) {
                if (obj.getChildMeshes && obj.getChildMeshes().length > 0) {
                    this.processMeshes(obj.getChildMeshes(), result, floorNodeMap);
                }
                return;
            }

            // Пропускаем маркеры - их обрабатывает MarkerParser
            if (MarkerUtils.isMarker(obj.name)) return;

            const floorNumber = this.findParentFloorNumber(obj);
            const type = this.determineType(obj.name);

            const element: BuildingElement = {
                name: obj.name,
                mesh: obj instanceof AbstractMesh ? obj : null as any,
                type,
                floorNumber: floorNumber ?? undefined,
                isVisible: true,
                originalMaterial: (obj instanceof AbstractMesh ? obj.material : null) as any,
                originalPosition: obj.position.clone(),
                originalRotation: obj.rotation.clone(),
                originalScaling: obj.scaling.clone(),
                metadata: {}
            };

            if (element.mesh) {
                result.elements.set(obj.name, element);
                this.categorizeElement(element, result, floorNumber);
            }

            const children = obj.getChildMeshes?.() ?? [];
            if (children.length > 0) {
                this.processMeshes(children, result, floorNodeMap);
            }
        });
    }

    /**
     * Определить тип элемента по имени
     */
    private determineType(name: string): ElementType {
        if (name.startsWith(this.config.WALL_PREFIX)) return 'wall';
        if (name.startsWith(this.config.WINDOW_PREFIX)) return 'window';
        if (name.startsWith(this.config.DOOR_PREFIX)) return 'door';
        if (name.startsWith(this.config.STAIR_PREFIX)) return 'stair';
        if (name.startsWith(this.config.FLOOR_PREFIX)) return 'floor';

        const lowerName = name.toLowerCase();
        if (lowerName.includes('window')) return 'window';
        if (lowerName.includes('door')) return 'door';
        if (lowerName.includes('stair')) return 'stair';
        if (lowerName.includes('wall')) return 'wall';
        if (lowerName.includes('room')) return 'floor';

        return 'other';
    }

    /**
     * Извлечь номер этажа из имени
     */
    private extractFloorNumber(name: string): number | null {
        const match = name.match(/_(\d+)(?:_|\.|$)/);
        if (match?.[1]) {
            const parsed = parseInt(match[1], 10);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    }

    /**
     * Найти номер этажа по родительской цепочке
     */
    private findParentFloorNumber(obj: AbstractMesh | TransformNode): number | null {
        let parent = obj.parent;
        while (parent) {
            if (parent.name?.startsWith(this.config.FLOOR_PREFIX)) {
                return this.extractFloorNumber(parent.name);
            }
            parent = parent.parent;
        }
        return null;
    }

    /**
     * Категоризировать элемент по типу
     */
    private categorizeElement(element: BuildingElement, result: BuildingParseResult, floorNumber: number | null): void {
        switch (element.type) {
            case 'floor':
                if (floorNumber !== null) {
                    const floorElements = result.floors.get(floorNumber) || [];
                    floorElements.push(element);
                    result.floors.set(floorNumber, floorElements);
                }
                break;
            case 'wall':
            case 'window':
            case 'door':
            case 'stair':
                result[`${element.type}s` as keyof Pick<BuildingParseResult, 'walls' | 'windows' | 'doors' | 'stairs'>].push(element);
                if (floorNumber !== null && element.floorNumber === undefined) {
                    element.floorNumber = floorNumber;
                }
                break;
        }
    }
}

// Временная утилита, пока MarkerUtils не экспортирован
const MarkerUtils = {
    isMarker(name: string): boolean {
        return name.startsWith('MR_') || name.startsWith('FL_') || name.startsWith('WP_');
    }
};
