import { Scene, TransformNode, AbstractMesh } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { BuildingElement, FloorData, UserInfo } from "@shared/types";
import { FLOOR_CONFIG } from "@shared/constants";
import { IFloorManager, IWallManager } from "@shared/interfaces";
import { FloorExpander } from "./floor-expander";
import { MarkerUtils } from "./connection-parser";

@injectable()
export class FloorManager implements IFloorManager {
    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private wallManager?: IWallManager;
    private floorExpander: FloorExpander;

    private readonly floors: Map<number, FloorData> = new Map();
    private readonly floorNodes: Map<number, TransformNode> = new Map();
    private readonly roomNodes: Map<string, AbstractMesh | TransformNode> = new Map();
    private readonly roomRoles: Map<string, UserInfo['role']> = new Map();
    private readonly roomFloors: Map<string, number> = new Map();
    private readonly stairsByFloor: Map<number, BuildingElement[]> = new Map();
    private readonly stairPreviewClones: Map<string, AbstractMesh> = new Map();
    private currentFloorNum: number = FLOOR_CONFIG.DEFAULT_FLOOR;
    private viewMode: 'single' | 'all' = 'all';
    private isExpanded: boolean = false;
    private currentUserInfo: UserInfo = { isAuthenticated: false, role: 'guest' };
    private readonly floorRoles: Map<number, UserInfo['role']> = new Map();

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
        this.roomNodes.clear();
        this.roomRoles.clear();
        this.roomFloors.clear();
        this.stairsByFloor.clear();
        this.clearStairPreviews();
        this.logger.info("FloorManager disposed");
    }

    public setWallManager(wallManager: IWallManager): void {
        this.wallManager = wallManager;
    }

    public addRoom(room: any): void {
        if (room.node) {
            this.roomNodes.set(room.id, room.node);
        }

        if (room.requiredRole) {
            this.roomRoles.set(room.id, room.requiredRole);
        }

        if (room.floorNumber !== undefined) {
            this.roomFloors.set(room.id, room.floorNumber);
        }
    }

    public addStair(element: BuildingElement): void {
        const floorNumber = element.floorNumber;
        if (floorNumber === undefined || floorNumber === null) {
            return;
        }

        const stairs = this.stairsByFloor.get(floorNumber) || [];
        stairs.push(element);
        this.stairsByFloor.set(floorNumber, stairs);
    }

    public setUserInfo(userInfo: UserInfo): void {
        this.currentUserInfo = {
            isAuthenticated: userInfo.isAuthenticated,
            username: userInfo.username,
            role: userInfo.role ?? (userInfo.isAuthenticated ? 'user' : 'guest')
        };

        if (this.viewMode === 'single' && !this.canAccessFloor(this.currentFloorNum)) {
            const nextAccessibleFloor = this.getAccessibleFloorNumbers()[0];
            if (nextAccessibleFloor !== undefined) {
                this.showFloor(nextAccessibleFloor);
            }
        } else if (this.viewMode === 'single') {
            this.showFloor(this.currentFloorNum);
        } else if (this.viewMode === 'all') {
            this.showAllFloors();
        }
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
            this.floorRoles.set(floorNumber, MarkerUtils.extractFloorRequiredRole(floorNode.name));
        }
    }

    public showFloor(floorNumber: number): void {
        if (!this.floors.has(floorNumber)) {
            this.logger.warn(`Floor ${floorNumber} does not exist. Available: ${this.floorNumbers.join(', ')}`);
            return;
        }

        if (!this.canAccessFloor(floorNumber)) {
            this.eventBus.emit(EventType.UI_NOTIFICATION, {
                message: `Нет доступа к этажу ${floorNumber}`,
                type: 'warning',
                duration: 5000
            });
            return;
        }

        this.logger.info(`Showing floor ${floorNumber}`);

        this.clearStairPreviews();
        this.floorNodes.forEach((node, num) => node.setEnabled(num === floorNumber));
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

        this.applyRoomVisibilityForMode('single', floorNumber);
        this.updateStairVisibilityForSingleFloor(floorNumber);

        this.eventBus.emit(EventType.FLOOR_CHANGED, {
            floor: floorNumber,
            mode: this.viewMode,
            pivotY: this.getContextPivotY(floorNumber)
        });
    }

    public showAllFloors(): void {
        this.logger.info("Showing all floors");

        this.clearStairPreviews();
        this.floorNodes.forEach((node, floor) => node.setEnabled(this.canAccessFloor(floor)));
        this.wallManager?.showAllWalls();

        for (const [floorNumber, floor] of this.floors.entries()) {
            const visible = this.canAccessFloor(floorNumber);
            for (const element of floor.elements) {
                element.mesh.isVisible = visible;
                element.isVisible = visible;
            }
            floor.isVisible = visible;
        }

        this.applyRoomVisibilityForMode('all');
        this.updateStairVisibilityForAllFloors();

        this.eventBus.emit(EventType.FLOOR_CHANGED, {
            floor: 'all',
            mode: this.viewMode,
            pivotY: this.getContextPivotY('all')
        });
    }

    public hideAllFloors(): void {
        this.clearStairPreviews();
        this.floorNodes.forEach(node => node.setEnabled(false));
        this.roomNodes.forEach(node => node.setEnabled(false));
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
            const targetFloor = this.canAccessFloor(this.currentFloorNum)
                ? this.currentFloorNum
                : this.getAccessibleFloorNumbers()[0];

            if (targetFloor !== undefined) {
                this.showFloor(targetFloor);
            }
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
        const floors = this.getAccessibleFloorNumbers();
        if (floors.length === 0) return 1;
        const first = floors[0];
        return first !== undefined ? first : 1;
    }

    public get maxFloor(): number {
        const floors = this.getAccessibleFloorNumbers();
        if (floors.length === 0) return 1;
        const last = floors[floors.length - 1];
        return last !== undefined ? last : 1;
    }

    public getAccessibleFloorNumbers(): number[] {
        return this.floorNumbers.filter(floorNumber => this.canAccessFloor(floorNumber));
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
        if (this.viewMode === 'single') {
            this.updateStairVisibilityForSingleFloor(this.currentFloorNum);
        } else {
            this.updateStairVisibilityForAllFloors();
        }
        this.eventBus.emit(EventType.FLOOR_EXPAND_CHANGED, {
            expanded: true,
            pivotY: this.getContextPivotY(this.viewMode === 'single' ? this.currentFloorNum : 'all')
        });
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
        if (this.viewMode === 'single') {
            this.updateStairVisibilityForSingleFloor(this.currentFloorNum);
        } else {
            this.updateStairVisibilityForAllFloors();
        }
        this.eventBus.emit(EventType.FLOOR_EXPAND_CHANGED, {
            expanded: false,
            pivotY: this.getContextPivotY(this.viewMode === 'single' ? this.currentFloorNum : 'all')
        });
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

    private getContextPivotY(context: number | 'all'): number {
        if (context === 'all') {
            const floorCenters = this.floorNumbers
                .map(floorNumber => this.getFloorPivotY(floorNumber))
                .filter((value): value is number => value !== null);

            if (floorCenters.length > 0) {
                const sum = floorCenters.reduce((acc, value) => acc + value, 0);
                return sum / floorCenters.length;
            }

            return 0;
        }

        return this.getFloorPivotY(context) ?? 0;
    }

    private getFloorPivotY(floorNumber: number): number | null {
        const floor = this.floors.get(floorNumber);
        if (!floor) return null;

        const relevantElements = floor.elements.filter(element => element.type !== 'wall');
        const elements = relevantElements.length > 0 ? relevantElements : floor.elements;

        const centers = elements
            .map(element => element.mesh.getBoundingInfo?.().boundingBox.centerWorld.y ?? element.mesh.position.y)
            .filter((value) => Number.isFinite(value));

        if (centers.length === 0) {
            const floorNode = this.floorNodes.get(floorNumber);
            return floorNode ? floorNode.position.y : null;
        }

        const sum = centers.reduce((acc, value) => acc + value, 0);
        return sum / centers.length;
    }

    private canAccessFloor(floorNumber: number): boolean {
        return MarkerUtils.hasRequiredRole(this.currentUserInfo.role, this.floorRoles.get(floorNumber));
    }

    private canAccessRoom(roomId: string): boolean {
        return MarkerUtils.hasRequiredRole(this.currentUserInfo.role, this.roomRoles.get(roomId));
    }

    private applyRoomVisibilityForMode(mode: 'single' | 'all', currentFloor?: number): void {
        this.roomNodes.forEach((node, roomId) => {
            const roomFloor = this.roomFloors.get(roomId);
            const hasRoomAccess = this.canAccessRoom(roomId);
            const isVisibleByFloor = mode === 'all'
                ? roomFloor === undefined || this.canAccessFloor(roomFloor)
                : roomFloor === currentFloor;

            node.setEnabled(hasRoomAccess && isVisibleByFloor);
        });
    }

    private updateStairVisibilityForSingleFloor(floorNumber: number): void {
        this.setAllStairsVisibility(false);

        const currentFloorStairs = this.stairsByFloor.get(floorNumber) || [];
        currentFloorStairs.forEach(stair => this.setStairVisibility(stair, true));

        const accessibleFloors = this.getAccessibleFloorNumbers();
        const currentIndex = accessibleFloors.indexOf(floorNumber);
        if (currentIndex > 0) {
            const previousFloor = accessibleFloors[currentIndex - 1];
            if (previousFloor !== undefined) {
                const previousStairs = this.stairsByFloor.get(previousFloor) || [];
                previousStairs.forEach(stair => this.createStairPreviewClone(stair));
            }
        }
    }

    private updateStairVisibilityForAllFloors(): void {
        this.clearStairPreviews();
        this.stairsByFloor.forEach((stairs, floorNumber) => {
            const visible = this.canAccessFloor(floorNumber);
            stairs.forEach(stair => this.setStairVisibility(stair, visible));
        });
    }

    private setAllStairsVisibility(visible: boolean): void {
        this.stairsByFloor.forEach(stairs => {
            stairs.forEach(stair => this.setStairVisibility(stair, visible));
        });
    }

    private setStairVisibility(stair: BuildingElement, visible: boolean): void {
        const roomId = stair.metadata?.roomId as string | undefined;
        const canShow = visible && (!roomId || this.canAccessRoom(roomId));
        stair.mesh.isVisible = canShow;
        stair.isVisible = canShow;
    }

    private createStairPreviewClone(stair: BuildingElement): void {
        const roomId = stair.metadata?.roomId as string | undefined;
        if (roomId && !this.canAccessRoom(roomId)) {
            return;
        }

        const key = stair.name;
        if (this.stairPreviewClones.has(key)) {
            const existingClone = this.stairPreviewClones.get(key);
            if (existingClone) {
                existingClone.setEnabled(true);
            }
            return;
        }

        const clone = stair.mesh.clone(`${stair.name}_preview`, null);
        if (!clone) return;

        clone.parent = null;
        clone.position = stair.mesh.getAbsolutePosition().clone();
        clone.rotationQuaternion = stair.mesh.absoluteRotationQuaternion?.clone() ?? clone.rotationQuaternion;
        clone.scaling = stair.mesh.scaling.clone();
        clone.isPickable = false;
        clone.metadata = { ...clone.metadata, stairPreview: true };
        this.stairPreviewClones.set(key, clone);
    }

    private clearStairPreviews(): void {
        this.stairPreviewClones.forEach(clone => clone.dispose());
        this.stairPreviewClones.clear();
    }
}
