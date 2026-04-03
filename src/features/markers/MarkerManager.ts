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
import { createTestMarkers, getTestMarkersStats } from "../../data/test/markers";
import { MarkerType, AnyMarkerData, FocusOptions, PathResult } from "../../shared/types";
import { ICameraManager, IMarkerManager } from "@shared/interfaces";

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

  /**
   * Установить сцену
   */
  public setScene(scene: Scene): void {
    this.scene = scene;
    this._graphRenderer.initialize(scene, this._graph);
    this.setupHoverDetection();
  }

  /**
   * Установить менеджер камеры
   */
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
      hoveredMarker = this.findMarkerByMesh(pickResult.pickedMesh);
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
    
    // Первый проход: создаём все маркеры без связей
    const testData = createTestMarkers();
    testData.forEach(data => {
        this.createMarkerWithoutConnections(data);
    });
    
    // Второй проход: добавляем все связи
    this._markers.forEach(marker => {
        this._graph.addConnectionsFromMarker(marker);
    });
    
    this._graphRenderer.renderAll();
    this._graphRenderer.hide();
    this.setWaypointsVisible(false);
    
    this._isInitialized = true;
    
    const stats = getTestMarkersStats();
    this.logger.info(`MarkerManager initialized: ${stats.total} markers, ${stats.connections} connections`);
    this.eventBus.emit(EventType.MARKERS_LOADED, stats);
}

private createMarkerWithoutConnections(data: AnyMarkerData): Marker {
    if (!this.scene) {
        throw new Error("Scene not set before creating marker");
    }
    
    const widget = new MarkerWidget(this.logger);
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
    
    this.eventBus.emit(EventType.MARKER_ADDED, { marker: marker.id });
    return marker;
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
    
    const widget = new MarkerWidget(this.logger);
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
    
    this.eventBus.emit(EventType.MARKER_ADDED, { marker: marker.id });
    return marker;
  }

  private handleMarkerClick(marker: Marker): void {
    if (this._selectedMarker === marker) return;
    
    this._selectedMarker?.setSelected(false);
    marker.setSelected(true);
    this._selectedMarker = marker;
    this._onMarkerSelectedCallback?.(marker);
    
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
    return this._pathfinder.findShortestPath(fromId, toId);
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
    
    if (this._graphVisible) {
      this._graphRenderer.show();
    } else {
      this._graphRenderer.hide();
    }
    
    this.setWaypointsVisible(this._graphVisible);
    this.eventBus.emit(EventType.GRAPH_VISIBILITY_CHANGED, { visible: this._graphVisible });
    this.logger.info(`Graph ${this._graphVisible ? 'shown' : 'hidden'}`);
  }

  public clearSelection(): void {
    if (this._selectedMarker) {
      this._selectedMarker.setSelected(false);
      this._selectedMarker = null;
      this._onMarkerSelectedCallback?.(null);
      
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
    }
    
    this._onMarkerSelectedCallback?.(marker);
  }

  public dispose(): void {
    this.clearAllMarkers();
    this._graphRenderer.clear();
    this.logger.info("MarkerManager disposed");
  }

  // Геттеры для интерфейса IMarkerManager
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
}