import { AbstractMesh, TransformNode } from "@babylonjs/core";
import { injectable } from "inversify";
import { Logger } from "../../core/logger/Logger";
import { BuildingElement, ElementType, BuildingParseResult } from "../../shared/types";
import { BUILDING_PARSER } from "../../shared/constants";
import { IBuildingParser } from "@shared/interfaces";
import { MarkerParser } from './MarkerParser';

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

        this.logger.debug('=== ALL OBJECTS ===');
        allObjects.forEach(obj => {
            this.logger.debug(`Object: ${obj.name}, Type: ${obj.getClassName()}, Parent: ${obj.parent?.name || 'null'}`);
        });

        const markersFound = allObjects.filter(obj =>
            obj.name.startsWith('MR_') ||
            obj.name.startsWith('FL_') ||
            obj.name.startsWith('WP_')
        );
        this.logger.debug(`Found ${markersFound.length} potential markers:`, markersFound.map(m => m.name));

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
        this.logger.debug(`Found ${result.floorNodes.size} floor nodes`);

        // 2. Создаём карту этажей для всех объектов
        const floorNodeMap = new Map<AbstractMesh | TransformNode, number>();
        result.floorNodes.forEach((node, floorNum) => {
            floorNodeMap.set(node, floorNum);
            this.logger.debug(`Floor node mapping: ${node.name} -> floor ${floorNum}`);
        });

        // 3. Обрабатываем строительные элементы (стены, полы и т.д.)
        this.processMeshes(allObjects, result, floorNodeMap);

        // 4. Парсим маркеры и комнаты с передачей карты этажей
        const { markers, rooms } = this.markerParser.parseMarkersAndRooms(allObjects, floorNodeMap);
        result.markers = markers;
        result.rooms = rooms;

        this.logger.info(`Parsing complete: ${result.elements.size} elements, ${result.floors.size} floors, ${result.walls.length} walls, ${result.markers.size} markers, ${result.rooms.size} rooms`);

        if (result.floors.size > 0) {
            this.logger.info(`Floor numbers: ${Array.from(result.floors.keys()).join(', ')}`);
        }

        return result;
    }

    private findFloorNodes(objects: (AbstractMesh | TransformNode)[], floorNodes: Map<number, TransformNode>): void {
        objects.forEach(obj => {
            if (obj.name.startsWith(this.config.FLOOR_PREFIX) && obj instanceof TransformNode) {
                const floorNum = this.extractFloorNumber(obj.name);
                if (floorNum !== null) {
                    floorNodes.set(floorNum, obj);
                    this.logger.debug(`Found floor node ${floorNum}: ${obj.name}`);
                }
            }
        });
    }

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

            // Пропускаем маркеры - они будут обработаны MarkerParser
            if (obj.name.startsWith('MR_') || obj.name.startsWith('FL_') || obj.name.startsWith('WP_')) {
                return;
            }

            let floorNumber: number | null = null;

            let parent = obj.parent;
            while (parent) {
                if (parent.name && parent.name.startsWith(this.config.FLOOR_PREFIX)) {
                    floorNumber = this.extractFloorNumber(parent.name);
                    break;
                }
                parent = parent.parent;
            }

            const type = this.determineType(obj.name);

            const element: BuildingElement = {
                name: obj.name,
                mesh: obj instanceof AbstractMesh ? obj : null as any,
                type,
                floorNumber: floorNumber !== null ? floorNumber : undefined,
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

            if (obj.getChildMeshes && obj.getChildMeshes().length > 0) {
                this.processMeshes(obj.getChildMeshes(), result, floorNodeMap);
            }
        });
    }

    private determineType(name: string): ElementType {
        if (name.startsWith('Room_')) return 'floor';
        if (name.startsWith(this.config.WALL_PREFIX)) return 'wall';
        if (name.startsWith(this.config.WINDOW_PREFIX)) return 'window';
        if (name.startsWith(this.config.DOOR_PREFIX)) return 'door';
        if (name.startsWith(this.config.STAIR_PREFIX)) return 'stair';
        if (name.startsWith(this.config.FLOOR_PREFIX)) return 'other';

        const lowerName = name.toLowerCase();
        if (lowerName.includes('window')) return 'window';
        if (lowerName.includes('door')) return 'door';
        if (lowerName.includes('stair')) return 'stair';
        if (lowerName.includes('wall')) return 'wall';
        if (lowerName.includes('room')) return 'floor';

        return 'other' as ElementType;
    }

    private extractFloorNumber(name: string): number | null {
        const match = name.match(/_(\d+)(?:_|\.|$)/);
        if (match && match[1]) {
            const parsed = parseInt(match[1], 10);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    }

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
                result.walls.push(element);
                if (floorNumber !== null && element.floorNumber === undefined) {
                    element.floorNumber = floorNumber;
                }
                break;
            case 'window':
                result.windows.push(element);
                if (floorNumber !== null && element.floorNumber === undefined) {
                    element.floorNumber = floorNumber;
                }
                break;
            case 'door':
                result.doors.push(element);
                if (floorNumber !== null && element.floorNumber === undefined) {
                    element.floorNumber = floorNumber;
                }
                break;
            case 'stair':
                result.stairs.push(element);
                if (floorNumber !== null && element.floorNumber === undefined) {
                    element.floorNumber = floorNumber;
                }
                break;
        }
    }
}