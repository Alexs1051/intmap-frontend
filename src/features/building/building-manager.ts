import { Scene, Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { BuildingElement, ElementType, BuildingParseResult, BuildingDimensions, ParsedMarker, ParsedRoom, UserInfo } from "@shared/types";
import type { IBuildingAnimator, IBuildingLoader, IBuildingManager, IBuildingParser, IFloorManager, IWallManager } from "@shared/interfaces";
import { MarkerUtils } from "./connection-parser";

@injectable()
export class BuildingManager implements IBuildingManager {
    private logger: Logger;
    private eventBus: EventBus;
    private scene?: Scene;

    private _loader: IBuildingLoader;
    private _parser: IBuildingParser;
    private _animator: IBuildingAnimator;
    private _floorManager: IFloorManager;
    private _wallManager: IWallManager;

    private _data: BuildingParseResult | null = null;
    private _isLoaded: boolean = false;
    private _dimensions: BuildingDimensions = { height: 30, width: 30, depth: 30 };
    private _center: Vector3 = Vector3.Zero();
    private _userInfo: UserInfo = { isAuthenticated: false, role: 'guest' };
    private _markerManagerRef: any = null;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus,
        @inject(TYPES.BuildingLoader) loader: IBuildingLoader,
        @inject(TYPES.BuildingParser) parser: IBuildingParser,
        @inject(TYPES.BuildingAnimator) animator: IBuildingAnimator,
        @inject(TYPES.FloorManager) floorManager: IFloorManager,
        @inject(TYPES.WallManager) wallManager: IWallManager
    ) {
        this.logger = logger.getLogger('BuildingManager');
        this.eventBus = eventBus;
        this._loader = loader;
        this._parser = parser;
        this._animator = animator;
        this._floorManager = floorManager;
        this._wallManager = wallManager;
    }

    public setScene(scene: Scene): void {
        this.scene = scene;
        this._loader.setScene(scene);
        this._animator.setScene(scene);
        (this._floorManager as any).setScene?.(scene);
        (this._wallManager as any).setScene?.(scene);
        this._floorManager.setWallManager(this._wallManager);
    }

    public async load(onProgress?: (progress: number) => void): Promise<void> {
        onProgress?.(1);
    }

    public async initialize(): Promise<void> {
        // Инициализация происходит в loadBuilding
    }

    public update(_deltaTime: number): void {
        // BuildingManager не требует обновления
    }

    public async loadBuilding(
        modelUrl: string,
        onProgress?: (progress: number) => void
    ): Promise<void> {
        if (!this.scene) {
            throw new Error("Scene not set");
        }

        this.eventBus.emit(EventType.LOADING_START, { url: modelUrl, type: 'building' });

        try {
            onProgress?.(0.1);
            const loadResult = await this._loader.loadModel(modelUrl, (p) => {
                onProgress?.(0.1 + p * 0.3);
            });

            onProgress?.(0.4);
            this._data = this._parser.parseMeshes(loadResult);

            onProgress?.(0.6);
            this.initializeManagers();
            this.calculateDimensions();
            this.calculateCenter();

            onProgress?.(1.0);
            this._isLoaded = true;
            this.eventBus.emit(EventType.BUILDING_LOADED, { dimensions: this._dimensions });

        } catch (error) {
            this.eventBus.emit(EventType.LOADING_ERROR, { error });
            throw error;
        }
    }

    private initializeManagers(): void {
        if (!this._data) return;

        this._data.floors.forEach((elements, floorNumber) => {
            const floorNode = this._data?.floorNodes.get(floorNumber);
            elements.forEach(element => this._floorManager.addFloor(element, floorNode));
        });

        this._data.rooms.forEach(room => {
            this._floorManager.addRoom(room);
        });

        this._data.stairs.forEach(stair => {
            this._floorManager.addStair(stair);
        });

        this._data.walls.forEach(element => this._wallManager.addWall(element));
        this._floorManager.setUserInfo(this._userInfo);
        this._floorManager.showAllFloors();

        // Инициализируем FloorManager после добавления всех этажей
        (this._floorManager as any).initialize?.();

        this.logger.info(`Managers initialized. Floors: ${this._floorManager.floorCount}, Walls: ${this._wallManager.count}`);
    }

    /**
     * Установить MarkerManager (вызывается после инициализации MarkerManager)
     */
    public setMarkerManager(markerManager: any): void {
        this._markerManagerRef = markerManager;
        (this._floorManager as any).setMarkerManager?.(markerManager);
        this.logger.debug('MarkerManager set in BuildingManager -> FloorManager');
    }

    public setUserInfo(userInfo: UserInfo): void {
        this._userInfo = {
            isAuthenticated: userInfo.isAuthenticated,
            username: userInfo.username,
            role: userInfo.role ?? (userInfo.isAuthenticated ? 'user' : 'guest')
        };
        this._floorManager.setUserInfo(this._userInfo);
    }

    /**
     * Вычислить габариты здания из bounding box элементов
     */
    private calculateDimensions(): void {
        if (!this._data) return;

        const bounds = this.computeBounds();
        this._dimensions = {
            height: Math.max(10, bounds.maxY - bounds.minY),
            width: Math.max(10, bounds.maxX - bounds.minX),
            depth: Math.max(10, bounds.maxZ - bounds.minZ)
        };
    }

    /**
     * Вычислить центр здания
     */
    private calculateCenter(): void {
        if (!this._data) {
            this._center = Vector3.Zero();
            return;
        }

        const bounds = this.computeBounds();
        this._center = new Vector3(
            (bounds.minX + bounds.maxX) / 2,
            (bounds.minY + bounds.maxY) / 2,
            (bounds.minZ + bounds.maxZ) / 2
        );
    }

    /**
     * Вычислить bounding box всех элементов
     */
    private computeBounds(): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        this._data!.elements.forEach(element => {
            const bbox = element.mesh.getBoundingInfo();
            minX = Math.min(minX, bbox.boundingBox.minimum.x);
            maxX = Math.max(maxX, bbox.boundingBox.maximum.x);
            minY = Math.min(minY, bbox.boundingBox.minimum.y);
            maxY = Math.max(maxY, bbox.boundingBox.maximum.y);
            minZ = Math.min(minZ, bbox.boundingBox.minimum.z);
            maxZ = Math.max(maxZ, bbox.boundingBox.maximum.z);
        });

        return { minX, maxX, minY, maxY, minZ, maxZ };
    }

    public async animateConstruction(): Promise<void> {
        if (!this._data) {
            this.logger.warn("No data for animation");
            return;
        }

        this.logger.info("Starting construction animation");

        this._data.elements.forEach(element => {
            if (!element.mesh.metadata) element.mesh.metadata = {};
            element.mesh.metadata.originalPosition = element.mesh.position.clone();
            element.mesh.isVisible = false;
        });

        const wallsByFloor = new Map<number, BuildingElement[]>();
        this._data.walls.forEach(wall => {
            if (wall.floorNumber) {
                const walls = wallsByFloor.get(wall.floorNumber) || [];
                walls.push(wall);
                wallsByFloor.set(wall.floorNumber, walls);
            }
        });

        await this._animator.animateConstruction(this._data.floors, wallsByFloor);
        this.logger.info("Construction animation complete");
    }

    public async reloadBuilding(modelUrl: string): Promise<void> {
        this.logger.info(`Reloading building: ${modelUrl}`);
        this._loader.unloadModel();

        if (this._data) {
            this._animator.resetAllElements(Array.from(this._data.elements.values()));
        }

        this._floorManager.dispose();
        this._wallManager.dispose();

        if (this.scene) {
            this._floorManager.setScene(this.scene);
            this._wallManager.setScene(this.scene);
        }
        this._floorManager.setWallManager(this._wallManager);
        if (this._markerManagerRef) {
            (this._floorManager as any).setMarkerManager?.(this._markerManagerRef);
        }

        this._data = null;
        this._isLoaded = false;
        await this.loadBuilding(modelUrl);
    }

    public toggleWallTransparency(): void {
        this._wallManager.toggleTransparency();
    }

    public toggleFloorExpand(): void {
        (this._floorManager as any).toggleFloorExpand?.();
    }

    public setWallTransparency(transparent: boolean): void {
        this._wallManager.setTransparency(transparent);
    }

    public getElement(name: string): BuildingElement | undefined {
        return this._data?.elements.get(name);
    }

    public getElementsByType(type: ElementType): BuildingElement[] {
        if (!this._data) return [];
        return Array.from(this._data.elements.values()).filter(el => el.type === type);
    }

    public dispose(): void {
        this._loader.unloadModel();
        this._animator.resetAllElements(this._data ? Array.from(this._data.elements.values()) : []);
        (this._floorManager as any).dispose?.();
        (this._wallManager as any).dispose?.();
        this._data = null;
        this._isLoaded = false;
    }

    /**
     * Получить все парсенные маркеры
     */
    public getMarkers(): Map<string, ParsedMarker> {
        if (!this._data) {
            return new Map();
        }
        this.logger.debug(`getMarkers: returning ${this._data.markers.size} markers`);
        return this._data.markers;
    }

    /**
     * Получить маркер по ID
     */
    public getMarkerById(id: string): ParsedMarker | undefined {
        return this._data?.markers.get(id);
    }

    /**
     * Получить все парсенные комнаты
     */
    public getRooms(): Map<string, ParsedRoom> {
        return this._data?.rooms || new Map();
    }

    /**
     * Получить комнату по ID
     */
    public getRoomById(id: string): ParsedRoom | undefined {
        return this._data?.rooms.get(id);
    }

    /**
     * Получить маркеры по этажу
     */
    public getMarkersByFloor(floorNumber: number): ParsedMarker[] {
        if (!this._data) return [];
        const markers: ParsedMarker[] = [];
        for (const marker of this._data.markers.values()) {
            if (marker.floorNumber === floorNumber) {
                markers.push(marker);
            }
        }
        return markers;
    }

    public hasAccessToFloor(floorNumber: number): boolean {
        const floorNode = this._data?.floorNodes.get(floorNumber);
        const requiredRole = floorNode ? MarkerUtils.extractFloorRequiredRole(floorNode.name) : undefined;
        return MarkerUtils.hasRequiredRole(this._userInfo.role, requiredRole);
    }

    public hasAccessToRoom(roomId?: string): boolean {
        if (!roomId) return true;
        const room = this._data?.rooms.get(roomId);
        return MarkerUtils.hasRequiredRole(this._userInfo.role, room?.requiredRole);
    }

    // Геттеры для интерфейса
    public get isLoaded(): boolean { return this._isLoaded; }
    public get dimensions(): BuildingDimensions { return this._dimensions; }
    public get center(): Vector3 { return this._center; }
    public get height(): number { return this._dimensions.height; }
    public get width(): number { return this._dimensions.width; }
    public get depth(): number { return this._dimensions.depth; }
    public get floorManager(): IFloorManager { return this._floorManager; }
    public get wallManager(): IWallManager { return this._wallManager; }
    public get data(): BuildingParseResult | null { return this._data; }
    public get animator(): IBuildingAnimator { return this._animator; }
}
