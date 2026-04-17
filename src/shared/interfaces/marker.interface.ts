import { Mesh, Nullable, Quaternion, Ray, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { MarkerType, MarkerData, FocusOptions, PathResult, RGBA, UserInfo } from "@shared/types";
import { MarkerGraph } from "@features/markers/graph/marker-graph";
import { ICameraManager } from "./camera.interface";
import { IWallManager } from "./building.interface";
import { ILoadableComponent } from "./scene.interface";

export interface IMarker {
    readonly id: string;
    readonly type: MarkerType;
    readonly data: MarkerData;
    readonly name: string;
    readonly iconName: string;
    readonly floor: number;
    readonly backgroundColor: RGBA;
    readonly textColor: RGBA;
    readonly position: Vector3;
    readonly isSelected: boolean;
    readonly isHovered: boolean;
    readonly isFromMarker: boolean;
    readonly isToMarker: boolean;
    readonly root: TransformNode;
    readonly mesh: Mesh;
    readonly isVisible: boolean;

    update(cameraPosition: Vector3, cameraUpVector?: Vector3, cameraRotationQuaternion?: Nullable<Quaternion>): void;
    handleClick(): void;
    handleDoubleClick(): void;
    setSelected(selected: boolean): void;
    setHovered(hovered: boolean): void;
    setAsFromMarker(isFrom: boolean): void;
    setAsToMarker(isTo: boolean): void;
    setVisible(visible: boolean): void;
    hasQR(): boolean;
    getQR(): string | undefined;
    dispose(): void;
}

// В shared/interfaces/marker.interface.ts

export interface IMarkerManager extends ILoadableComponent {
    readonly markers: IMarker[];
    readonly selectedMarker: IMarker | null;
    readonly hoveredMarker: IMarker | null;
    readonly graphVisible: boolean;
    readonly graph: any;
    readonly pathfinder: any;

    setScene(scene: Scene): void;
    setCameraManager(cameraManager: ICameraManager): void;
    setWallManager(wallManager: IWallManager): void;
    handleScenePick(ray: Ray): boolean;

    createMarker(data: MarkerData): IMarker;
    getMarker(id: string): IMarker | undefined;
    getMarkersByType(type: MarkerType): IMarker[];
    getAllMarkers(): IMarker[];
    removeMarker(id: string): boolean;
    clearAllMarkers(): void;

    findPath(fromId: string, toId: string): PathResult | null;
    highlightPath(pathIds: string[]): void;
    clearPathHighlight(): void;

    focusOnMarker(markerId: string, options?: FocusOptions): Promise<void>;
    setWaypointsVisible(visible: boolean): void;
    toggleGraph(): void;

    setOnMarkerSelected(callback: (marker: IMarker | null) => void): void;
    setSelectedMarker(marker: IMarker | null): void;

    load(onProgress?: (progress: number) => void): Promise<void>;
    initialize(): Promise<void>;
    update(deltaTime: number): void;
    dispose(): void;

    setBuildingManager(buildingManager: any): void;

    setAllMarkersVisible(visible: boolean): void;

    setCurrentFloor(floor: number | 'all'): void;
    setUserInfo(userInfo: UserInfo): void;
    setMarkersMuted(muted: boolean): void;
    hasAccessToMarker(markerId: string): boolean;
    setFromMarker(markerId: string): void;
    setToMarker(markerId: string): void;
    getFromMarker(): string | null;
    getToMarker(): string | null;

    updateMarkersVisibility(): void;
    rebuildGraph(): void;
}

export interface IMarkerGraph {
    readonly nodeCount: number;
    readonly edgeCount: number;

    addNode(marker: IMarker): void;
    addConnection(fromId: string, toId: string, direction: string, weight?: number): boolean;
    findPath(startId: string, endId: string, options?: { blockedMarkerIds?: Set<string> }): { path: string[]; totalDistance: number } | null;
    getNeighbors(markerId: string): IMarker[];
    getMarker(id: string): IMarker | undefined;
    getAllMarkers(): IMarker[];
    removeNode(markerId: string): boolean;
}

export interface IMarkerGraphRenderer {
    readonly isVisible: boolean;

    initialize(scene: Scene, graph: MarkerGraph): void;
    renderAll(): void;
    renderForMarker(markerId: string): void;
    highlightMarker(markerId: string): void;
    highlightPath(markerIds: string[]): void;
    resetHighlight(): void;
    clearRoute(): void;
    show(): void;
    hide(): void;
    clear(): void;
}
