import { Scene, Vector3, AbstractMesh, TransformNode, Mesh } from "@babylonjs/core";
import { BuildingElement, ElementType, BuildingParseResult, BuildingDimensions } from "@shared/types";
import { ISceneComponent, ILoadableComponent } from "./scene.interface";
import { ParsedMarker, ParsedRoom } from "@shared/types/dto/building.dto";

export interface IBuildingLoader {
    setScene(scene: Scene): void;
    loadModel(modelUrl: string, onProgress?: (progress: number) => void): Promise<{
        meshes: AbstractMesh[];
        transformNodes: TransformNode[];
        rootMesh: AbstractMesh | null;
    }>;
    unloadModel(): void;
}

export interface IBuildingParser {
    parseMeshes(loadResult: { meshes: AbstractMesh[]; transformNodes: TransformNode[]; rootMesh: AbstractMesh | null }): BuildingParseResult;
}

export interface IBuildingAnimator {
    setScene(scene: Scene): void;
    animateConstruction(floors: Map<number, BuildingElement[]>, wallsByFloor: Map<number, BuildingElement[]>): Promise<void>;
    resetAllElements(elements: BuildingElement[]): void;
}

export interface IFloorManager extends ISceneComponent {
    setScene(scene: Scene): void;
    setWallManager(wallManager: IWallManager): void;
    addFloor(element: BuildingElement, floorNode?: TransformNode): void;
    showFloor(floorNumber: number): void;
    showAllFloors(): void;
    hideAllFloors(): void;
    getViewMode(): 'single' | 'all';
    setViewMode(mode: 'single' | 'all'): void;
    toggleViewMode(): void;
    toggleFloorExpand(): Promise<void>;
    expandFloors(): Promise<void>;
    collapseFloors(): Promise<void>;
    getFloorExpandState(): boolean;
    isFloorAnimating(): boolean;
    hasFloor(floorNumber: number): boolean;
    readonly currentFloor: number;
    readonly floorNumbers: number[];
    readonly floorCount: number;
    readonly minFloor: number;
    readonly maxFloor: number;
}

export interface IWallManager extends ISceneComponent {
    setScene(scene: Scene): void;
    addWall(element: BuildingElement): void;
    showWallsForFloor(floorNumber: number): void;
    showAllWalls(): void;
    hideAllWalls(): void;
    toggleTransparency(): void;
    setTransparency(transparent: boolean): void;
    /** Назначает rendering group для маркера, чтобы он отображался поверх стен */
    assignMarkerRenderingGroup(mesh: Mesh): void;
    readonly count: number;
    readonly isTransparent: boolean;
}

export interface IBuildingManager extends ILoadableComponent {
    setScene(scene: Scene): void;
    loadBuilding(modelUrl: string, onProgress?: (progress: number) => void): Promise<void>;
    animateConstruction(): Promise<void>;
    reloadBuilding(modelUrl: string): Promise<void>;
    toggleWallTransparency(): void;
    toggleFloorExpand(): void;
    setWallTransparency(transparent: boolean): void;
    setMarkerManager(markerManager: any): void;
    getElement(name: string): BuildingElement | undefined;
    getElementsByType(type: ElementType): BuildingElement[];
    dispose(): void;

    /** Получить все парсенные маркеры */
    getMarkers(): Map<string, ParsedMarker>;

    /** Получить маркер по ID */
    getMarkerById(id: string): ParsedMarker | undefined;

    /** Получить все парсенные комнаты */
    getRooms(): Map<string, ParsedRoom>;

    /** Получить комнату по ID */
    getRoomById(id: string): ParsedRoom | undefined;

    /** Получить маркеры по этажу */
    getMarkersByFloor(floorNumber: number): ParsedMarker[];

    readonly isLoaded: boolean;
    readonly dimensions: BuildingDimensions;
    readonly center: Vector3;
    readonly height: number;
    readonly width: number;
    readonly depth: number;
    readonly floorManager: IFloorManager;
    readonly wallManager: IWallManager;
    readonly data: BuildingParseResult | null;
    readonly animator: IBuildingAnimator;
}