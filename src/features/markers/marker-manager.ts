import { Scene, Ray, Quaternion } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { MarkerApi } from "@core/api/marker-api";
import { Marker } from "./marker";
import { MarkerGraph } from "./graph/marker-graph";
import { MarkerGraphRenderer } from "./graph/marker-graph-renderer";
import { Pathfinder } from "./pathfinder";
import { MarkerVisibilityService, MarkerVisibilityContext } from "./marker-visibility-service";
import { MarkerSelectionService, MarkerSelectionContext } from "./marker-selection-service";
import { MarkerLoadingService, MarkerLoadingContext } from "./marker-loading-service";
import { MarkerInteractionService, MarkerInteractionContext } from "./marker-interaction-service";
import { MarkerPathService, MarkerPathContext } from "./marker-path-service";
import { MarkerType, AnyMarkerData, FocusOptions, PathResult, UserInfo, BuildingOption } from "@shared/types";
import { IBuildingManager, ICameraManager, IMarkerManager, IWallManager } from "@shared/interfaces";

/**
 * Менеджер маркеров
 * Отвечает за создание, управление и отображение маркеров
 */
@injectable()
export class MarkerManager implements IMarkerManager {
  private logger: Logger;
  private eventBus: EventBus;
  private scene?: Scene;
  private cameraManager?: ICameraManager;
  private wallManager?: IWallManager;

  private _markers: Map<string, Marker> = new Map();
  private _graph: MarkerGraph;
  private _graphRenderer: MarkerGraphRenderer;
  private _pathfinder: Pathfinder;

  private _selectedMarker: Marker | null = null;
  private _hoveredMarker: Marker | null = null;
  private _highlightedPath: string[] | null = null;
  private _graphVisible: boolean = false;
  private _isInitialized: boolean = false;
  private _onMarkerSelectedCallback: ((marker: Marker | null) => void) | null = null;

  private lastClickTime: number = 0;
  private readonly doubleClickThreshold: number = 300;

  private _selectedForPathMarkers: Set<string> = new Set();
  private _currentFloor: number | 'all' = 1;
  private _fromMarkerId: string | null = null;
  private _toMarkerId: string | null = null;
  private _buildingManager: IBuildingManager | null = null;
  private _currentBuilding: BuildingOption | null = null;
  private _userInfo: UserInfo = { isAuthenticated: false, role: 'guest' };
  private _markersMuted: boolean = false;
  private readonly markerApi: MarkerApi = new MarkerApi();
  private readonly visibilityService: MarkerVisibilityService;
  private readonly selectionService: MarkerSelectionService;
  private readonly loadingService: MarkerLoadingService;
  private readonly interactionService: MarkerInteractionService;
  private readonly pathService: MarkerPathService;

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.EventBus) eventBus: EventBus,
    @inject(TYPES.MarkerGraph) graph: MarkerGraph,
    @inject(TYPES.MarkerGraphRenderer) graphRenderer: MarkerGraphRenderer,
    @inject(TYPES.Pathfinder) pathfinder: Pathfinder
  ) {
    this.logger = logger.getLogger('MarkerManager');
    this.eventBus = eventBus;
    this._graph = graph;
    this._graphRenderer = graphRenderer;
    this._pathfinder = pathfinder;
    this.visibilityService = new MarkerVisibilityService();
    this.selectionService = new MarkerSelectionService();
    this.loadingService = new MarkerLoadingService();
    this.interactionService = new MarkerInteractionService();
    this.pathService = new MarkerPathService();
  }

  public setScene(scene: Scene): void {
    this.scene = scene;
    this._graphRenderer.initialize(scene, this._graph);
    this.interactionService.setupHoverDetection(this.getInteractionContext());
  }

  public setCameraManager(cameraManager: ICameraManager): void {
    this.cameraManager = cameraManager;
  }

  public setWallManager(wallManager: IWallManager): void {
    this.wallManager = wallManager;
  }

  public setBuildingManager(buildingManager: IBuildingManager): void {
    this._buildingManager = buildingManager;
    this.logger.debug('BuildingManager set in MarkerManager');
  }

  public setCurrentBuilding(building: BuildingOption | null): void {
    this._currentBuilding = building;
  }

  public async load(onProgress?: (progress: number) => void): Promise<void> {
    this.logger.debug("Loading markers");
    onProgress?.(0.5);
    onProgress?.(1.0);
  }

  public async initialize(): Promise<void> {
    await this.loadingService.initialize(this.getLoadingContext());
  }

  private getVisibilityContext(): MarkerVisibilityContext {
    return {
      logger: this.logger,
      eventBus: this.eventBus,
      markers: this._markers,
      graphRenderer: this._graphRenderer,
      buildingManager: this._buildingManager,
      userInfo: this._userInfo,
      currentFloor: this._currentFloor,
      graphVisible: this._graphVisible,
      selectedMarker: this._selectedMarker,
      selectedForPathMarkers: this._selectedForPathMarkers,
      markersMuted: this._markersMuted
    };
  }

  private getSelectionContext(): MarkerSelectionContext {
    return {
      logger: this.logger,
      eventBus: this.eventBus,
      markers: this._markers,
      selectedMarker: this._selectedMarker,
      setSelectedMarkerRef: (marker) => {
        this._selectedMarker = marker;
      },
      selectedForPathMarkers: this._selectedForPathMarkers,
      fromMarkerId: this._fromMarkerId,
      toMarkerId: this._toMarkerId,
      setFromMarkerId: (markerId) => {
        this._fromMarkerId = markerId;
      },
      setToMarkerId: (markerId) => {
        this._toMarkerId = markerId;
      },
      onMarkerSelectedCallback: this._onMarkerSelectedCallback,
      updateMarkersVisibility: () => this.updateMarkersVisibility(),
      focusOnMarker: (markerId, options) => this.focusOnMarker(markerId, options)
    };
  }

  private getLoadingContext(): MarkerLoadingContext {
    return {
      logger: this.logger,
      eventBus: this.eventBus,
      markerApi: this.markerApi,
      scene: this.scene,
      wallManager: this.wallManager,
      markers: this._markers,
      graph: this._graph,
      graphRenderer: this._graphRenderer,
      setGraphRendererMarkerManager: () => this._graphRenderer.setMarkerManager(this),
      buildingManager: this._buildingManager,
      currentBuilding: this._currentBuilding,
      userInfo: this._userInfo,
      graphVisible: this._graphVisible,
      setGraphVisibleRef: (visible) => {
        this._graphVisible = visible;
      },
      setCurrentFloorRef: (floor) => {
        this._currentFloor = floor;
      },
      setInitializedRef: (value) => {
        this._isInitialized = value;
      },
      setSelectedMarkerRef: (marker) => {
        this._selectedMarker = marker;
      },
      setHoveredMarkerRef: (marker) => {
        this._hoveredMarker = marker;
      },
      setHighlightedPathRef: (path) => {
        this._highlightedPath = path;
      },
      selectedForPathMarkers: this._selectedForPathMarkers,
      updateMarkersVisibility: () => this.updateMarkersVisibility(),
      getMarkersStats: () => this.getMarkersStats(),
      handleMarkerClick: (marker) => this.handleMarkerClick(marker),
      handleMarkerDoubleClick: (marker) => this.handleMarkerDoubleClick(marker),
      applyGatewayVisualState: (marker) => this.applyGatewayVisualState(marker)
    };
  }

  private getInteractionContext(): MarkerInteractionContext {
    return {
      logger: this.logger,
      scene: this.scene,
      graphRenderer: this._graphRenderer,
      activeCamera: this.cameraManager?.activeCamera,
      graphVisible: this._graphVisible,
      highlightedPath: this._highlightedPath,
      hoveredMarker: this._hoveredMarker,
      setHoveredMarkerRef: (marker) => {
        this._hoveredMarker = marker;
      },
      markers: this._markers,
      lastClickTime: this.lastClickTime,
      setLastClickTime: (value) => {
        this.lastClickTime = value;
      },
      doubleClickThreshold: this.doubleClickThreshold,
      clearSelection: () => this.clearSelection()
    };
  }

  private getPathContext(): MarkerPathContext {
    return {
      logger: this.logger,
      eventBus: this.eventBus,
      pathfinder: this._pathfinder,
      graphRenderer: this._graphRenderer,
      markers: this._markers,
      highlightedPath: this._highlightedPath,
      setHighlightedPathRef: (path) => {
        this._highlightedPath = path;
      },
      hoveredMarker: this._hoveredMarker,
      graphVisible: this._graphVisible,
      buildingManager: this._buildingManager,
      setGraphVisibleRef: (visible) => {
        this._graphVisible = visible;
      },
      updateMarkersVisibility: () => this.updateMarkersVisibility(),
      isGatewayBlocked: (markerId) => this.isGatewayBlocked(markerId)
    };
  }

  /**
   * Основная логика видимости маркеров
   */
  public updateMarkersVisibility(): void {
    this.visibilityService.updateMarkersVisibility(this.getVisibilityContext());
  }

  /**
   * Установка текущего этажа или режима "здание"
   */
  public setCurrentFloor(floor: number | 'all'): void {
    this._currentFloor = floor;
    this.updateMarkersVisibility();
    this.logger.debug(`Current floor set to: ${floor === 'all' ? 'all (building mode)' : floor}`);
  }

  public setUserInfo(userInfo: UserInfo): void {
    this._userInfo = {
      isAuthenticated: userInfo.isAuthenticated,
      username: userInfo.username,
      role: userInfo.role ?? (userInfo.isAuthenticated ? 'user' : 'guest')
    };

    this._markers.forEach(marker => {
      if (marker.type === MarkerType.GATEWAY) {
        void this.applyGatewayVisualState(marker);
      }
    });

    this.updateMarkersVisibility();
  }

  public setMarkersMuted(muted: boolean): void {
    this._markersMuted = muted;
    this.updateMarkersVisibility();
  }

  public hasAccessToMarker(markerId: string): boolean {
    return this.visibilityService.hasAccessToMarker(this.getVisibilityContext(), markerId);
  }

  /**
   * Установка видимости графа
   */
  public setGraphVisible(visible: boolean): void {
    this._graphVisible = visible;
    this.visibilityService.setGraphVisible(this.getVisibilityContext(), visible);
  }

  /**
   * Выбор маркера как "Отсюда"
   */
  public setFromMarker(markerId: string): void {
    this.selectionService.setFromMarker(this.getSelectionContext(), markerId);
  }

  /**
   * Выбор маркера как "Сюда"
   */
  public setToMarker(markerId: string): void {
    this.selectionService.setToMarker(this.getSelectionContext(), markerId);
  }

  /**
   * Очистить выбор маршрута (сбросить и "Отсюда", и "Сюда")
   */
  public clearRouteSelection(): void {
    this.selectionService.clearRouteSelection(this.getSelectionContext());
  }

  /**
   * Добавить маркер в выделенные (Сюда/Отсюда)
   */
  public selectMarkerForPath(markerId: string): void {
    this.selectionService.selectMarkerForPath(this.getSelectionContext(), markerId);
  }

  public clearSelectedPathMarkers(): void {
    this.selectionService.clearSelectedPathMarkers(this.getSelectionContext());
  }

  /**
   * Убрать маркер из выделенных
   */
  public deselectMarkerFromPath(markerId: string): void {
    this.selectionService.deselectMarkerFromPath(this.getSelectionContext(), markerId);
  }

  /**
   * Очистить все выделенные маркеры
   */
  public clearSelectedMarkers(): void {
    this.selectionService.clearSelectedMarkers(this.getSelectionContext());
  }

  /**
   * Проверить, выделен ли маркер для пути
   */
  public isMarkerSelectedForPath(markerId: string): boolean {
    return this.selectionService.isMarkerSelectedForPath(this.getSelectionContext(), markerId);
  }

  /**
   * Получить все выделенные маркеры
   */
  public getSelectedMarkersForPath(): string[] {
    return this.selectionService.getSelectedMarkersForPath(this.getSelectionContext());
  }

  private getMarkersStats(): { total: number; connections: number } {
    return {
      total: this._markers.size,
      connections: this._graph.edgeCount
    };
  }

  public update(_deltaTime: number): void {
    if (!this.cameraManager) return;

    const activeCamera = this.cameraManager.activeCamera;
    const cameraPosition = activeCamera.position;
    const cameraUpVector = 'upVector' in activeCamera ? activeCamera.upVector.clone() : undefined;
    const cameraRotationMatrix = activeCamera.computeWorldMatrix().getRotationMatrix();
    const cameraRotationQuaternion = Quaternion.Identity();
    Quaternion.FromRotationMatrixToRef(cameraRotationMatrix, cameraRotationQuaternion);

    this._markers.forEach(marker => {
      marker.update(cameraPosition, cameraUpVector, cameraRotationQuaternion);
    });
  }

  public createMarker(data: AnyMarkerData): Marker {
    return this.loadingService.createMarker(this.getLoadingContext(), data);
  }

  private handleMarkerClick(marker: Marker): void {
    this.selectionService.handleMarkerClick(this.getSelectionContext(), marker);
  }

  private handleMarkerDoubleClick(marker: Marker): void {
    this.selectionService.handleMarkerDoubleClick(this.getSelectionContext(), marker);
  }

  public handleScenePick(ray: Ray): boolean {
    return this.interactionService.handleScenePick(this.getInteractionContext(), ray);
  }

  public async focusOnMarker(markerId: string, options?: FocusOptions): Promise<void> {
    const marker = this.getMarker(markerId);
    if (!marker || !this.cameraManager) return;

    const distance = options?.distance || 8;
    const duration = options?.duration || 1.0;

    await this.cameraManager.focusOnPoint(marker.position, distance, duration);
  }

  public findPath(fromId: string, toId: string): PathResult | null {
    return this.pathService.findPath(this.getPathContext(), fromId, toId);
  }

  public highlightPath(pathIds: string[]): void {
    this.pathService.highlightPath(this.getPathContext(), pathIds);
  }

  public clearPathHighlight(): void {
    this.pathService.clearPathHighlight(this.getPathContext());
  }

  public setWaypointsVisible(visible: boolean): void {
    this.pathService.setWaypointsVisible(this.getPathContext(), visible);
  }

  public toggleGraph(): void {
    // Проверяем, не выполняется ли анимация этажей
    try {
      const buildingManager = this._buildingManager;
      if (buildingManager && buildingManager.floorManager && buildingManager.floorManager.isFloorAnimating?.()) {
        this.logger.debug('Ignoring graph toggle - floor animation in progress');
        return;
      }
    } catch { }

    this._graphVisible = !this._graphVisible;
    this.logger.debug(`Toggling graph to: ${this._graphVisible}`);

    // Обновляем видимость маркеров (это вызовет updateVisibility для графа)
    this.updateMarkersVisibility();

    // Дополнительно показываем/скрываем рендерер если нужно
    if (this._graphVisible) {
      this._graphRenderer.show();
    } else {
      this._graphRenderer.hide();
    }

    this.eventBus.emit(EventType.GRAPH_VISIBILITY_CHANGED, { visible: this._graphVisible });
    this.logger.info(`Graph ${this._graphVisible ? 'shown' : 'hidden'}`);
  }

  /**
   * Полностью перестроить граф с текущими позициями маркеров
   */
  public rebuildGraph(): void {
    this.pathService.rebuildGraph(this.getPathContext());
  }

  public clearSelection(): void {
    this.selectionService.clearSelection(this.getSelectionContext(), () => {
      if (!this._highlightedPath) {
        this._graphRenderer.resetHighlight();
      }
    });
  }

  public clearAllMarkers(): void {
    this.loadingService.clearAllMarkers(this.getLoadingContext());
  }

  public getMarker(id: string): Marker | undefined {
    return this._markers.get(id);
  }

  public getAllMarkers(): Marker[] {
    return Array.from(this._markers.values());
  }

  public getMarkersByType(type: MarkerType): Marker[] {
    return this.getAllMarkers().filter(m => m.type === type);
  }

  public removeMarker(id: string): boolean {
    const removed = this._markers.delete(id);
    if (removed) {
      this._graph.removeNode(id);
      this._selectedForPathMarkers.delete(id);
      if (this._highlightedPath?.includes(id)) {
        this.clearPathHighlight();
      }
      this.eventBus.emit(EventType.MARKER_REMOVED, { marker: id });
    }
    return removed;
  }

  public setOnMarkerSelected(callback: (marker: Marker | null) => void): void {
    this._onMarkerSelectedCallback = callback;
  }

  public setSelectedMarker(marker: Marker | null): void {
    this.selectionService.setSelectedMarker(this.getSelectionContext(), marker);
  }

  public dispose(): void {
    this.clearAllMarkers();
    this._graphRenderer.clear();
    this.logger.info("MarkerManager disposed");
  }

  // Геттеры
  public get markers(): Marker[] {
    return this.getAllMarkers();
  }

  public get selectedMarker(): Marker | null {
    return this._selectedMarker;
  }

  public get hoveredMarker(): Marker | null {
    return this._hoveredMarker;
  }

  public get graphVisible(): boolean {
    return this._graphVisible;
  }

  public get graph(): MarkerGraph {
    return this._graph;
  }

  public get pathfinder(): Pathfinder {
    return this._pathfinder;
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get currentFloor(): number | 'all' {
    return this._currentFloor;
  }

  public getFromMarker(): string | null {
    return this._fromMarkerId;
  }

  public getToMarker(): string | null {
    return this._toMarkerId;
  }

  private isGatewayBlocked(markerId: string): boolean {
    const marker = this._markers.get(markerId);
    return !!marker && marker.type === MarkerType.GATEWAY && !this.hasAccessToMarker(markerId);
  }

  private async applyGatewayVisualState(marker: Marker): Promise<void> {
    const hasAccess = this.hasAccessToMarker(marker.id);
    const backgroundColor = { r: 0, g: 0, b: 0, a: 0 };
    const textColor = hasAccess
      ? { r: 0.95, g: 0.8, b: 0.2, a: 1 }
      : { r: 0.95, g: 0.25, b: 0.2, a: 1 };

    marker.data.hasAccess = hasAccess;
    marker.data.isBlocked = !hasAccess;
    marker.data.iconName = hasAccess ? 'gateway-allowed' : 'gateway-blocked';
    marker.data.requiredRole = marker.data.requiredRole
      ?? this._buildingManager?.getMarkerById?.(marker.id)?.metadata?.requiredRole;
    marker.data.blockedMessage = hasAccess ? undefined : 'Нет доступа';
    marker.data.backgroundColor = backgroundColor;
    marker.data.textColor = textColor;

    await marker.updateAppearance({
      iconName: marker.data.iconName,
      backgroundColor,
      textColor,
      hasAccess,
      isBlocked: !hasAccess,
      blockedMessage: marker.data.blockedMessage
    });
  }
}
