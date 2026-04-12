import { Scene, Ray } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { EventBus } from "../../core/events/EventBus";
import { EventType } from "../../core/events/EventTypes";
import { ConfigService } from "../../core/config/ConfigService";
import { Marker } from "./Marker";
import { MarkerWidget } from "./components/MarkerWidget";
import { MarkerAnimator } from "./MarkerAnimator";
import { MarkerGraph } from "./graph/MarkerGraph";
import { MarkerGraphRenderer } from "./graph/MarkerGraphRenderer";
import { Pathfinder } from "./Pathfinder";
import { container } from "../../core/di/Container";
import { MarkerType, AnyMarkerData, FocusOptions, PathResult, ParsedMarker, RGBA } from "../../shared/types";
import { ICameraManager, IMarkerManager, IBuildingManager } from "@shared/interfaces";

// Шаблоны описаний (импортируются как raw строки через webpack asset/source)
import markerTemplate from '../../data/templates/marker.md';
import flagTemplate from '../../data/templates/flag.md';

/**
 * Менеджер маркеров
 */
@injectable()
export class MarkerManager implements IMarkerManager {
  private logger: Logger;
  private eventBus: EventBus;
  private config: ConfigService;
  private scene?: Scene;
  private cameraManager?: ICameraManager;

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
  private raycasterActive: boolean = false;

  // Новые поля для логики видимости
  private _selectedForPathMarkers: Set<string> = new Set(); // Маркеры "Сюда/Отсюда"
  private _currentFloor: number | 'all' = 1;
  private _fromMarkerId: string | null = null;  // "Отсюда"
  private _toMarkerId: string | null = null;    // "Сюда"

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.EventBus) eventBus: EventBus,
    @inject(TYPES.ConfigService) configService: ConfigService,
    @inject(TYPES.MarkerGraph) graph: MarkerGraph,
    @inject(TYPES.MarkerGraphRenderer) graphRenderer: MarkerGraphRenderer,
    @inject(TYPES.Pathfinder) pathfinder: Pathfinder
  ) {
    this.logger = logger.getLogger('MarkerManager');
    this.eventBus = eventBus;
    this.config = configService;
    this._graph = graph;
    this._graphRenderer = graphRenderer;
    this._pathfinder = pathfinder;
  }

  public setScene(scene: Scene): void {
    this.scene = scene;
    this._graphRenderer.initialize(scene, this._graph);
    this.setupHoverDetection();
  }

  public setCameraManager(cameraManager: ICameraManager): void {
    this.cameraManager = cameraManager;
  }

  private setupHoverDetection(): void {
    if (!this.scene) return;

    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    canvas.addEventListener('mousemove', (event) => {
      if (this.raycasterActive) return;
      this.raycasterActive = true;

      requestAnimationFrame(() => {
        this.checkHover(event);
        this.raycasterActive = false;
      });
    });
  }

  private checkHover(event: MouseEvent): void {
    if (!this.scene) return;

    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / canvas.width * canvas.width;
    const y = (event.clientY - rect.top) / canvas.height * canvas.height;

    const ray = this.scene.createPickingRay(x, y, null, this.cameraManager?.camera || null);
    const pickResult = this.scene.pickWithRay(ray, (mesh) => mesh.metadata?.widget !== undefined);

    let hoveredMarker: Marker | null = null;

    if (pickResult?.hit) {
      const potentialMarker = this.findMarkerByMesh(pickResult.pickedMesh);
      if (potentialMarker && potentialMarker.isVisible) {
        hoveredMarker = potentialMarker;
      }
    }

    if (this._hoveredMarker !== hoveredMarker) {
      if (this._hoveredMarker) {
        this._hoveredMarker.setHovered(false);
        if (!this._highlightedPath) {
          this._graphRenderer.resetHighlight();
        }
      }

      this._hoveredMarker = hoveredMarker;

      if (this._hoveredMarker) {
        this._hoveredMarker.setHovered(true);
        if (this._graphVisible && !this._highlightedPath) {
          this._graphRenderer.highlightMarker(this._hoveredMarker.id);
        }
      }
    }
  }

  private findMarkerByMesh(mesh: any): Marker | null {
    if (!mesh?.metadata?.widget) return null;

    for (const marker of this._markers.values()) {
      if (marker.mesh === mesh) return marker;
    }
    return null;
  }

  public async load(onProgress?: (progress: number) => void): Promise<void> {
    this.logger.debug("Loading markers");
    onProgress?.(0.5);
    onProgress?.(1.0);
  }

  public async initialize(): Promise<void> {
    this.logger.info("Initializing MarkerManager");

    this.clearAllMarkers();

    const buildingManager = container.get<IBuildingManager>(TYPES.BuildingManager);
    const markersFromBuilding = buildingManager.getMarkers();

    if (markersFromBuilding && markersFromBuilding.size > 0) {
      this.logger.info(`Loading ${markersFromBuilding.size} markers from building data`);

      for (const [, markerData] of markersFromBuilding) {
        this.logger.debug(`Creating marker ${markerData.id} on floor ${markerData.floorNumber}`);
        const anyMarkerData = this.convertToMarkerData(markerData);
        this.createMarker(anyMarkerData);
      }

      this.logger.info(`Successfully loaded ${this._markers.size} markers`);
    } else {
      this.logger.warn("No markers found in building data");
    }

    // Добавляем связи в граф
    this._markers.forEach(marker => {
      const connections = marker.data.connections;
      if (connections && connections.length > 0) {
        for (const conn of connections) {
          if (typeof conn === 'string') {
            this._graph.addConnection(marker.id, conn, 'two-way');
          } else if (typeof conn === 'object' && conn.toId) {
            this._graph.addConnection(conn.fromId || marker.id, conn.toId, conn.direction || 'two-way');
          }
        }
      }
    });

    this._graphRenderer.renderAll();
    this._graphRenderer.setMarkerManager(this);
    this._graphRenderer.hide();

    // Начальное состояние: граф выключен, показываем только маркеры 1-го этажа
    this._graphVisible = false;
    this._currentFloor = 1;

    this.eventBus.on(EventType.FLOOR_CHANGED, (event) => {
      const floorData = event.data;
      if (floorData && typeof floorData.floor !== 'undefined') {
        this._currentFloor = floorData.floor;
        this.updateMarkersVisibility();

        if (this._graphVisible) {
          this._graphRenderer.updateVisibility();
        }
      }
    });

    this._isInitialized = true;

    const stats = this.getMarkersStats();
    this.logger.info(`MarkerManager initialized: ${stats.total} markers, ${stats.connections} connections`);
    this.eventBus.emit(EventType.MARKERS_LOADED, stats);
  }

  /**
   * Основная логика видимости маркеров
   */
  public updateMarkersVisibility(): void {
    this.logger.debug('updateMarkersVisibility called', {
      graphVisible: this._graphVisible,
      currentFloor: this._currentFloor,
      totalMarkers: this._markers.size,
      selectedMarker: this._selectedMarker?.id
    });

    this._markers.forEach(marker => {
      // Маркеры, выбранные для пути (Сюда/Отсюда) - всегда видны
      if (this._selectedForPathMarkers.has(marker.id)) {
        marker.setVisible(true);
        return;
      }

      if (this._selectedMarker === marker) {
        marker.setVisible(true);
        return;
      }

      const isAllFloorsMode = this._currentFloor === 'all';

      if (isAllFloorsMode) {
        // В режиме "здание" показываем все маркеры, кроме waypoint (если граф выключен)
        if (marker.type === MarkerType.WAYPOINT) {
          marker.setVisible(this._graphVisible);
        } else {
          marker.setVisible(true);
        }
        return;
      }

      // Режим "этаж"
      const isCorrectFloor = marker.floor === this._currentFloor;

      if (marker.type === MarkerType.WAYPOINT) {
        // Waypoint отображаются только при включенном графе И на правильном этаже
        marker.setVisible(isCorrectFloor && this._graphVisible);
      } else {
        // Обычные маркеры и флаги отображаются всегда на правильном этаже
        marker.setVisible(isCorrectFloor);
      }
    });

    // Если граф видим, обновляем его отображение после изменения видимости маркеров
    if (this._graphVisible) {
      this._graphRenderer.updateVisibility();
    }
  }

  /**
   * Установка текущего этажа или режима "здание"
   */
  public setCurrentFloor(floor: number | 'all'): void {
    this._currentFloor = floor;
    this.updateMarkersVisibility();
    this.logger.debug(`Current floor set to: ${floor === 'all' ? 'all (building mode)' : floor}`);
  }

  /**
   * Установка видимости графа
   */
  public setGraphVisible(visible: boolean): void {
    this._graphVisible = visible;

    if (visible) {
      this._graphRenderer.show();
    } else {
      this._graphRenderer.hide();
    }

    this.updateMarkersVisibility();
    this.eventBus.emit(EventType.GRAPH_VISIBILITY_CHANGED, { visible: this._graphVisible });
  }

  /**
   * Выбор маркера как "Отсюда"
   */
  public setFromMarker(markerId: string): void {
    // Очищаем предыдущий "Отсюда"
    if (this._fromMarkerId) {
      const oldMarker = this._markers.get(this._fromMarkerId);
      if (oldMarker) {
        oldMarker.setAsFromMarker(false);
        this._selectedForPathMarkers.delete(this._fromMarkerId);
      }
    }

    this._fromMarkerId = markerId;

    if (markerId) {
      const marker = this._markers.get(markerId);
      if (marker) {
        marker.setAsFromMarker(true);
        this._selectedForPathMarkers.add(markerId);
        marker.setVisible(true);
      }
    }

    this.updateMarkersVisibility();
    this.logger.debug(`From marker set to: ${markerId || 'none'}`);
  }

  /**
   * Выбор маркера как "Сюда"
   */
  public setToMarker(markerId: string): void {
    // Очищаем предыдущий "Сюда"
    if (this._toMarkerId) {
      const oldMarker = this._markers.get(this._toMarkerId);
      if (oldMarker) {
        oldMarker.setAsToMarker(false);
        this._selectedForPathMarkers.delete(this._toMarkerId);
      }
    }

    this._toMarkerId = markerId;

    if (markerId) {
      const marker = this._markers.get(markerId);
      if (marker) {
        marker.setAsToMarker(true);
        this._selectedForPathMarkers.add(markerId);
        marker.setVisible(true);
      }
    }

    this.updateMarkersVisibility();
    this.logger.debug(`To marker set to: ${markerId || 'none'}`);
  }

  /**
   * Очистить выбор маршрута (сбросить и "Отсюда", и "Сюда")
   */
  public clearRouteSelection(): void {
    this.setFromMarker('');
    this.setToMarker('');
    this.logger.debug("Route selection cleared");
  }

  /**
   * Добавить маркер в выделенные (Сюда/Отсюда)
   */
  public selectMarkerForPath(markerId: string): void {
    // Просто добавляем в выделенные, но не трогаем видимость других
    if (!this._selectedForPathMarkers.has(markerId)) {
      this._selectedForPathMarkers.add(markerId);
      const marker = this._markers.get(markerId);
      if (marker) {
        marker.setVisible(true);
      }
      this.logger.debug(`Marker ${markerId} selected for path`);
    }
  }

  public clearSelectedPathMarkers(): void {
    this._selectedForPathMarkers.clear();
    this.updateMarkersVisibility();
    this.logger.debug("All path selected markers cleared");
  }

  /**
   * Убрать маркер из выделенных
   */
  public deselectMarkerFromPath(markerId: string): void {
    this._selectedForPathMarkers.delete(markerId);
    this.updateMarkersVisibility();
    this.logger.debug(`Marker ${markerId} deselected from path`);
  }

  /**
   * Очистить все выделенные маркеры
   */
  public clearSelectedMarkers(): void {
    this._selectedForPathMarkers.clear();
    this._fromMarkerId = null;
    this._toMarkerId = null;
  }

  /**
   * Проверить, выделен ли маркер для пути
   */
  public isMarkerSelectedForPath(markerId: string): boolean {
    return this._selectedForPathMarkers.has(markerId);
  }

  /**
   * Получить все выделенные маркеры
   */
  public getSelectedMarkersForPath(): string[] {
    return Array.from(this._selectedForPathMarkers);
  }

  private getMarkersStats(): { total: number; connections: number } {
    return {
      total: this._markers.size,
      connections: this._graph.edgeCount
    };
  }

  private convertToMarkerData(parsedMarker: ParsedMarker): AnyMarkerData {
    let backgroundColor: RGBA;
    let textColor: RGBA;

    switch (parsedMarker.type) {
      case 'marker':
        backgroundColor = { r: 0.2, g: 0.5, b: 0.8, a: 0.9 };
        textColor = { r: 0, g: 0.5, b: 0, a: 1 };
        break;
      case 'flag':
        backgroundColor = { r: 0.9, g: 0.3, b: 0.2, a: 0.9 };
        textColor = { r: 1, g: 1, b: 1, a: 1 };
        break;
      case 'waypoint':
        backgroundColor = { r: 0.3, g: 0.7, b: 0.3, a: 0.9 };
        textColor = { r: 1, g: 1, b: 1, a: 1 };
        break;
    }

    let iconName: string;
    switch (parsedMarker.type) {
      case 'marker':
        iconName = 'location_on';
        break;
      case 'flag':
        iconName = 'flag';
        break;
      case 'waypoint':
        iconName = 'circle';
        break;
    }

    return {
      id: parsedMarker.id,
      name: parsedMarker.displayName,
      type: parsedMarker.type === 'marker' ? MarkerType.MARKER :
        parsedMarker.type === 'flag' ? MarkerType.FLAG : MarkerType.WAYPOINT,
      position: parsedMarker.position,
      floor: parsedMarker.floorNumber || 1,
      iconName,
      backgroundColor,
      textColor,
      connections: parsedMarker.connections.map(targetId => ({
        fromId: parsedMarker.id,
        toId: targetId,
        direction: 'two-way' as const
      })),
      description: this.generateDescription(parsedMarker)
    };
  }

  private generateDescription(parsedMarker: ParsedMarker): string {
    // Waypoint не имеют описания
    if (parsedMarker.type === 'waypoint') {
      return '';
    }

    // Flag - шаблон с QR-кодом
    if (parsedMarker.type === 'flag') {
      const flagName = parsedMarker.displayName || `Флаг ${parsedMarker.metadata?.number || 'unknown'}`;
      const qrUrl = parsedMarker.metadata?.qr || `https://example.com/flag/${parsedMarker.metadata?.number || 'unknown'}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

      return flagTemplate
        .replace('{{FLAG_NAME}}', flagName)
        .replace('{{QR_IMAGE}}', `![QR-код](${qrImageUrl})`)
        .replace(/{{\w+}}/g, ''); // Убираем оставшиеся плейсхолдеры
    }

    // Marker - шаблон с названием и описанием
    return markerTemplate
      .replace('{{NAME}}', parsedMarker.displayName)
      .replace('{{DESCRIPTION}}', `Краткое описание для "${parsedMarker.displayName}".`);
  }

  public update(_deltaTime: number): void {
    if (!this.cameraManager) return;

    const cameraPosition = this.cameraManager.camera.position;
    this._markers.forEach(marker => {
      marker.update(cameraPosition);
    });
  }

  public createMarker(data: AnyMarkerData): Marker {
    if (!this.scene) {
      throw new Error("Scene not set before creating marker");
    }

    const widget = new MarkerWidget();
    const animator = new MarkerAnimator(this.logger, this.config);

    const marker = new Marker(
      this.logger,
      this.eventBus,
      widget,
      animator,
      this.scene,
      data
    );

    marker.onClick = (m) => this.handleMarkerClick(m);
    marker.onDoubleClick = (m) => this.handleMarkerDoubleClick(m);

    this._markers.set(data.id, marker);
    this._graph.addNode(marker);

    if (marker.type === MarkerType.WAYPOINT) {
      // Waypoint видны только если граф включен И на правильном этаже
      const isCorrectFloor = marker.floor === this._currentFloor;
      marker.setVisible(isCorrectFloor && this._graphVisible);
    } else {
      // Обычные маркеры видны на правильном этаже
      const isCorrectFloor = this._currentFloor === 'all' || marker.floor === this._currentFloor;
      marker.setVisible(isCorrectFloor);
    }

    this.eventBus.emit(EventType.MARKER_ADDED, { marker: marker.id });
    return marker;
  }

  private handleMarkerClick(marker: Marker): void {
    if (this._selectedMarker === marker) return;

    // Снимаем выделение со старого маркера
    if (this._selectedMarker) {
      this._selectedMarker.setSelected(false);
    }

    // Устанавливаем новый выделенный маркер
    marker.setSelected(true);
    this._selectedMarker = marker;
    this._onMarkerSelectedCallback?.(marker);

    // Обновляем видимость (скрываем старый маркер если нужно)
    this.updateMarkersVisibility();

    this.logger.debug(`Marker clicked: ${marker.id} (${marker.name})`);
    this.eventBus.emit(EventType.MARKER_SELECTED, { marker: marker.id });
  }

  private handleMarkerDoubleClick(marker: Marker): void {
    if (this._selectedMarker && this._selectedMarker !== marker) {
      this._selectedMarker.setSelected(false);
    }

    marker.setSelected(true);
    this._selectedMarker = marker;

    this.focusOnMarker(marker.id, { distance: 8, duration: 1.2 });
    this.logger.debug(`Marker double-clicked: ${marker.id} (${marker.name})`);
    this.eventBus.emit(EventType.MARKER_DOUBLE_CLICKED, { marker: marker.id });
  }

  public handleScenePick(ray: Ray): boolean {
    if (!this.scene) return false;

    const pickResult = this.scene.pickWithRay(ray, (mesh) => mesh.metadata?.widget !== undefined);

    if (pickResult?.hit) {
      const hitMarker = this.findMarkerByMesh(pickResult.pickedMesh);

      if (hitMarker) {
        if (!hitMarker.isVisible) {
          this.logger.debug(`Marker ${hitMarker.id} is hidden, ignoring click`);
          return false;
        }

        const now = Date.now();
        const timeSinceLast = now - this.lastClickTime;

        if (timeSinceLast < this.doubleClickThreshold) {
          hitMarker.handleDoubleClick();
          this.lastClickTime = 0;
        } else {
          hitMarker.handleClick();
          this.lastClickTime = now;
        }
        return true;
      }
    }

    // Клик по пустому пространству - снимаем выделение
    this.clearSelection();
    return false;
  }

  public async focusOnMarker(markerId: string, options?: FocusOptions): Promise<void> {
    const marker = this.getMarker(markerId);
    if (!marker || !this.cameraManager) return;

    if (this.cameraManager.isAnimating) return;

    const distance = options?.distance || 8;
    const duration = options?.duration || 1.0;

    await this.cameraManager.focusOnPoint(marker.position, distance, duration);
  }

  public findPath(fromId: string, toId: string): PathResult | null {
    this.logger.debug(`Finding path from ${fromId} to ${toId}`);

    const result = this._pathfinder.findShortestPath(fromId, toId);

    if (!result || !result.path || result.path.length === 0) {
      this.logger.warn(`Path not found from ${fromId} to ${toId}`);
      return null;
    }

    this.logger.debug(`Path found: ${result.path.map(p => p.markerId).join(' -> ')}`);

    return {
      found: true,
      path: result.path,
      totalDistance: result.totalDistance
    };
  }

  public highlightPath(pathIds: string[]): void {
    this.clearPathHighlight();
    this._highlightedPath = pathIds;

    if (pathIds.length >= 2) {
      this._graphRenderer.highlightPath(pathIds);
      this.eventBus.emit(EventType.PATH_HIGHLIGHTED, { path: pathIds });
    }
  }

  public clearPathHighlight(): void {
    this._highlightedPath = null;

    if (this._hoveredMarker && this._graphVisible) {
      this._graphRenderer.highlightMarker(this._hoveredMarker.id);
    } else {
      this._graphRenderer.resetHighlight();
    }
    this._graphRenderer.clearRoute();
  }

  public setWaypointsVisible(visible: boolean): void {
    this.getAllMarkers().forEach(marker => {
      if (marker.type === MarkerType.WAYPOINT) {
        marker.setVisible(visible);
      }
    });
    this.logger.info(`Waypoints ${visible ? 'shown' : 'hidden'}`);
  }

  public toggleGraph(): void {
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

  public clearSelection(): void {
    if (this._selectedMarker) {
      this._selectedMarker.setSelected(false);
      this._selectedMarker = null;
      this._onMarkerSelectedCallback?.(null);

      this.updateMarkersVisibility();

      if (!this._highlightedPath) {
        this._graphRenderer.resetHighlight();
      }
    }
  }

  public clearAllMarkers(): void {
    this._markers.forEach(marker => marker.dispose());
    this._markers.clear();
    this._graph.clear();
    this._selectedMarker = null;
    this._hoveredMarker = null;
    this._highlightedPath = null;
    this._selectedForPathMarkers.clear();
    this._graphRenderer.clear();
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
    if (this._selectedMarker === marker) return;

    if (this._selectedMarker) {
      this._selectedMarker.setSelected(false);
    }

    this._selectedMarker = marker;

    if (marker) {
      marker.setSelected(true);
      marker.setVisible(true);
    }

    this.updateMarkersVisibility();

    this._onMarkerSelectedCallback?.(marker);
  }

  public setAllMarkersVisible(visible: boolean): void {
    this._markers.forEach(marker => {
      marker.setVisible(visible);
    });
    this.logger.debug(`All markers ${visible ? 'shown' : 'hidden'}`);
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
}