import { AbstractMesh, TransformNode } from "@babylonjs/core";
import { injectable } from "inversify";
import { Logger } from "../../core/logger/Logger";
import { BuildingElement, ElementType, BuildingParseResult } from "../../shared/types";
import { BUILDING_PARSER } from "../../shared/constants";
import { IBuildingParser } from "@shared/interfaces";

@injectable()
export class BuildingParser implements IBuildingParser {
    private logger: Logger;
    private config = BUILDING_PARSER;

    constructor() {
        this.logger = Logger.getInstance().getLogger('BuildingParser');
    }

    public parseMeshes(meshes: AbstractMesh[]): BuildingParseResult {
        this.logger.debug(`Parsing ${meshes.length} meshes`);

        const result: BuildingParseResult = {
            elements: new Map(),
            floors: new Map(),
            floorNodes: new Map(),
            walls: [],
            windows: [],
            doors: [],
            stairs: []
        };

        this.findFloorNodes(meshes, result.floorNodes);
        const floorNodeMap = this.createFloorNodeMap(result.floorNodes);
        this.processMeshes(meshes, result, floorNodeMap);

        this.logger.info(`Parsing complete: ${result.elements.size} elements, ${result.floors.size} floors, ${result.walls.length} walls`);
        
        if (result.floors.size > 0) {
            this.logger.info(`Floor numbers: ${Array.from(result.floors.keys()).join(', ')}`);
        }

        return result;
    }

    private findFloorNodes(meshes: AbstractMesh[], floorNodes: Map<number, TransformNode>): void {
        meshes.forEach(mesh => {
            if (mesh.name.startsWith(this.config.FLOOR_PREFIX) && mesh instanceof TransformNode) {
                const floorNum = this.extractFloorNumber(mesh.name);
                if (floorNum !== null) {
                    floorNodes.set(floorNum, mesh);
                    this.logger.debug(`Found floor node ${floorNum}: ${mesh.name}`);
                }
            }
        });
    }

    private createFloorNodeMap(floorNodes: Map<number, TransformNode>): Map<AbstractMesh, number> {
        const map = new Map<AbstractMesh, number>();
        floorNodes.forEach((node, floorNum) => {
            map.set(node as AbstractMesh, floorNum);
        });
        return map;
    }

    private processMeshes(
        meshes: AbstractMesh[],
        result: BuildingParseResult,
        floorNodeMap: Map<AbstractMesh, number>
    ): void {
        meshes.forEach(mesh => {
            const isFloorNode = mesh.name.startsWith(this.config.FLOOR_PREFIX) && mesh instanceof TransformNode;
            
            let floorNumber: number | null = null;
            
            if (isFloorNode) {
                floorNumber = this.extractFloorNumber(mesh.name);
            } else {
                floorNumber = this.findFloorNumberInHierarchy(mesh, floorNodeMap);
            }
            
            const type = this.determineType(mesh.name);
            const isFloorElement = type === 'floor' && !isFloorNode;

            const element: BuildingElement = {
                name: mesh.name,
                mesh,
                type,
                floorNumber: floorNumber !== null ? floorNumber : undefined,
                isVisible: false,
                originalMaterial: mesh.material as any,
                originalPosition: mesh.position.clone(),
                originalRotation: mesh.rotation.clone(),
                originalScaling: mesh.scaling.clone(),
                metadata: {}
            };

            result.elements.set(mesh.name, element);
            this.categorizeElement(element, result, floorNumber);
            
            if (isFloorElement && floorNumber !== null) {
                const floorElements = result.floors.get(floorNumber) || [];
                floorElements.push(element);
                result.floors.set(floorNumber, floorElements);
            }
            
            if (mesh.getChildMeshes?.().length) {
                this.processMeshes(mesh.getChildMeshes(), result, floorNodeMap);
            }
        });
    }

    private findFloorNumberInHierarchy(mesh: AbstractMesh, floorNodeMap: Map<AbstractMesh, number>): number | null {
        let current: any = mesh;
        while (current) {
            if (floorNodeMap.has(current)) return floorNodeMap.get(current)!;
            current = current.parent;
        }
        
        const fromName = this.extractFloorNumber(mesh.name);
        if (fromName !== null) return fromName;
        
        this.logger.warn(`Element ${mesh.name} has no floor assignment`);
        return null;
    }

    private determineType(name: string): ElementType {
        if (name.startsWith(this.config.FLOOR_PREFIX)) return 'floor';
        if (name.startsWith(this.config.WALL_PREFIX)) return 'wall';
        if (name.startsWith(this.config.WINDOW_PREFIX)) return 'window';
        if (name.startsWith(this.config.DOOR_PREFIX)) return 'door';
        if (name.startsWith(this.config.STAIR_PREFIX)) return 'stair';

        const lowerName = name.toLowerCase();
        if (lowerName.includes('window')) return 'window';
        if (lowerName.includes('door')) return 'door';
        if (lowerName.includes('stair')) return 'stair';
        if (lowerName.includes('wall')) return 'wall';
        if (lowerName.includes('floor')) return 'floor';

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