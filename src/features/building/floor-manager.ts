import { Scene, TransformNode } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { BuildingElement, FloorData } from "@shared/types";
import { FLOOR_CONFIG } from "@shared/constants";
import { IFloorManager, IWallManager } from "@shared/interfaces";
import { FloorExpander } from "./floor-expander";

@injectable()
export class FloorManager implements IFloorManager {
    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private wallManager?: IWallManager;
    private floorExpander: FloorExpander;

    private readonly floors: Map<number, FloorData> = new Map();
    private readonly floorNodes: Map<number, TransformNode> = new Map();
    private currentFloorNum: number = FLOOR_CONFIG.DEFAULT_FLOOR;
    private viewMode: 'single' | 'all' = 'all';
    private isExpanded: boolean = false;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus,
        @inject(TYPES.FloorExpander) floorExpander: FloorExpander
    ) {
        this.logger = logger.getLogger('FloorManager');
        this.eventBus = eventBus;
        this.floorExpander = floorExpander;
    }

    public setScene(scene: Scene): void {
        this.floorExpander.setScene(scene);
    }

    public setMarkerManager(markerManager: any): void {
        this.floorExpander.setMarkerManager(markerManager);
        this.logger.debug('MarkerManager set in FloorManager');
    }

    public async initialize(): Promise<void> {
        this.logger.debug("FloorManager initialized");

        // Запоминаем оригинальные позиции этажей
        if (this.floorNodes.size > 0) {
            const allElements = new Map<string, BuildingElement>();
            this.floors.forEach(floor => {
                floor.elements.forEach(element => {
                    allElements.set(element.name, element);
                });
            });
            this.floorExpander.storeOriginalPositions(this.floorNodes, allElements);
        }
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

    /**
     * Переключить режим раскрытия этажей
     */
    public async toggleFloorExpand(): Promise<void> {
        if (this.isExpanded) {
            await this.collapseFloors();
        } else {
            await this.expandFloors();
        }
    }

    /**
     * Раскрыть этажи
     */
    public async expandFloors(): Promise<void> {
        if (this.isExpanded) {
            this.logger.debug('expandFloors: already expanded, skipping');
            return;
        }

        this.logger.info('Expanding floors');

        // Собираем все элементы
        const allElements = new Map<string, BuildingElement>();
        this.floors.forEach(floor => {
            floor.elements.forEach(element => {
                allElements.set(element.name, element);
            });
        });

        // Создаём Map<number, BuildingElement[]> для floorElements
        const floorElementsMap = new Map<number, BuildingElement[]>();
        this.floors.forEach((floorData, floorNum) => {
            floorElementsMap.set(floorNum, floorData.elements);
        });

        this.logger.debug(`expandFloors: ${this.floorNodes.size} floors, ${allElements.size} elements, ${this.floors.size} floor data entries`);

        await this.floorExpander.expand(this.floorNodes, floorElementsMap, allElements);
        this.isExpanded = true;
        this.eventBus.emit(EventType.FLOOR_EXPAND_CHANGED, { expanded: true });
        this.logger.info('expandFloors complete');
    }

    /**
     * Свернуть этажи
     */
    public async collapseFloors(): Promise<void> {
        if (!this.isExpanded) return;

        this.logger.info('Collapsing floors');

        // Собираем все элементы
        const allElements = new Map<string, BuildingElement>();
        this.floors.forEach(floor => {
            floor.elements.forEach(element => {
                allElements.set(element.name, element);
            });
        });

        // Создаём Map<number, BuildingElement[]> для floorElements
        const floorElementsMap = new Map<number, BuildingElement[]>();
        this.floors.forEach((floorData, floorNum) => {
            floorElementsMap.set(floorNum, floorData.elements);
        });

        await this.floorExpander.collapse(this.floorNodes, floorElementsMap, allElements);
        this.isExpanded = false;
        this.eventBus.emit(EventType.FLOOR_EXPAND_CHANGED, { expanded: false });
    }

    /**
     * Проверить, раскрыты ли этажи
     */
    public getFloorExpandState(): boolean {
        return this.isExpanded;
    }

    /**
     * Проверить, выполняется ли анимация этажей
     */
    public isFloorAnimating(): boolean {
        return this.floorExpander.getIsAnimating();
    }
}