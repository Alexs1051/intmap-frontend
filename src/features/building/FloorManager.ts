import { Scene, TransformNode } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { EventBus } from "../../core/events/EventBus";
import { EventType } from "../../core/events/EventTypes";
import { BuildingElement, FloorData } from "../../shared/types";
import { FLOOR_CONFIG } from "../../shared/constants";
import { IFloorManager, IWallManager } from "@shared/interfaces";

@injectable()
export class FloorManager implements IFloorManager {
    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private wallManager?: IWallManager;

    private readonly floors: Map<number, FloorData> = new Map();
    private readonly floorNodes: Map<number, TransformNode> = new Map();
    private currentFloorNum: number = FLOOR_CONFIG.DEFAULT_FLOOR;
    private viewMode: 'single' | 'all' = 'all';

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus
    ) {
        this.logger = logger.getLogger('FloorManager');
        this.eventBus = eventBus;
    }

    public setScene(_scene: Scene): void {
    }

    public async initialize(): Promise<void> {
        this.logger.debug("FloorManager initialized");
    }

    public update(_deltaTime: number): void {
        // Не требует обновления
    }

    public dispose(): void {
        this.floors.clear();
        this.floorNodes.clear();
        this.logger.info("FloorManager disposed");
    }

    public setWallManager(wallManager: IWallManager): void {
        this.wallManager = wallManager;
    }

    public addFloor(element: BuildingElement, floorNode?: TransformNode): void {
        const floorNumber = element.floorNumber;
        if (floorNumber === undefined || floorNumber === null) {
            this.logger.warn(`Element ${element.name} has no floor number`);
            return;
        }

        if (!this.floors.has(floorNumber)) {
            this.floors.set(floorNumber, {
                number: floorNumber,
                elements: [],
                isVisible: false
            });
            this.logger.debug(`Created floor ${floorNumber}`);
        }

        const floor = this.floors.get(floorNumber);
        if (floor) {
            floor.elements.push(element);
            this.logger.debug(`Added element ${element.name} to floor ${floorNumber}`);
        }

        if (floorNode && !this.floorNodes.has(floorNumber)) {
            this.floorNodes.set(floorNumber, floorNode);
            this.logger.debug(`Stored floor node for floor ${floorNumber}`);
        }
    }

    public showFloor(floorNumber: number): void {
        if (!this.floors.has(floorNumber)) {
            this.logger.warn(`Floor ${floorNumber} does not exist. Available: ${this.floorNumbers.join(', ')}`);
            return;
        }

        this.logger.info(`Showing floor ${floorNumber}`);

        this.floorNodes.forEach(node => node.setEnabled(true));
        this.wallManager?.showWallsForFloor(floorNumber);

        for (const [num, floor] of this.floors.entries()) {
            const visible = num === floorNumber;
            for (const element of floor.elements) {
                if (element.type !== 'wall') {
                    element.mesh.isVisible = visible;
                    element.isVisible = visible;
                }
            }
            floor.isVisible = visible;
        }

        this.currentFloorNum = floorNumber;

        if (this.viewMode === 'single') {
            this.hideOtherFloors(floorNumber);
        }

        this.eventBus.emit(EventType.FLOOR_CHANGED, {
            floor: floorNumber,
            mode: this.viewMode
        });
    }

    public showAllFloors(): void {
        this.logger.info("Showing all floors");

        this.floorNodes.forEach(node => node.setEnabled(true));
        this.wallManager?.showAllWalls();

        for (const floor of this.floors.values()) {
            for (const element of floor.elements) {
                element.mesh.isVisible = true;
                element.isVisible = true;
            }
            floor.isVisible = true;
        }

        this.eventBus.emit(EventType.FLOOR_CHANGED, {
            floor: 'all',
            mode: this.viewMode
        });
    }

    public hideAllFloors(): void {
        for (const floor of this.floors.values()) {
            for (const element of floor.elements) {
                element.mesh.isVisible = false;
                element.isVisible = false;
            }
            floor.isVisible = false;
        }
        this.wallManager?.hideAllWalls();
        this.eventBus.emit(EventType.FLOOR_HIDDEN);
    }

    private hideOtherFloors(floorNumber: number): void {
        for (const [num, floor] of this.floors.entries()) {
            if (num !== floorNumber) {
                for (const element of floor.elements) {
                    if (element.type !== 'wall') {
                        element.mesh.isVisible = false;
                        element.isVisible = false;
                    }
                }
                floor.isVisible = false;
            }
        }
    }

    public getViewMode(): 'single' | 'all' {
        return this.viewMode;
    }

    public setViewMode(mode: 'single' | 'all'): void {
        if (this.viewMode === mode) return;

        this.viewMode = mode;
        this.logger.info(`View mode set to: ${mode}`);

        if (mode === 'single') {
            this.showFloor(this.currentFloorNum);
        } else {
            this.showAllFloors();
        }

        this.eventBus.emit(EventType.VIEW_MODE_CHANGED, { mode, floor: this.currentFloorNum });
    }

    public toggleViewMode(): void {
        this.setViewMode(this.viewMode === 'all' ? 'single' : 'all');
    }

    public hasFloor(floorNumber: number): boolean {
        return this.floors.has(floorNumber);
    }

    public get currentFloor(): number {
        return this.currentFloorNum;
    }

    public get floorNumbers(): number[] {
        return Array.from(this.floors.keys()).sort((a, b) => a - b);
    }

    public get floorCount(): number {
        return this.floors.size;
    }

    public get minFloor(): number {
        const floors = this.floorNumbers;
        if (floors.length === 0) return 1;
        const first = floors[0];
        return first !== undefined ? first : 1;
    }

    public get maxFloor(): number {
        const floors = this.floorNumbers;
        if (floors.length === 0) return 1;
        const last = floors[floors.length - 1];
        return last !== undefined ? last : 1;
    }
}