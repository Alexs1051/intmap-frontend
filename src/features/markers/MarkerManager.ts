import { Scene, Vector3, Ray } from "@babylonjs/core";
import { Marker } from "./Marker";
import { AnyMarkerData, MarkerType, FocusOptions } from "./types";
import { MarkerGraph } from "./graph/MarkerGraph";
import { MarkerGraphRenderer } from "./graph/MarkerGraphRenderer";
import { Pathfinder } from "./Pathfinder";
import { MarkerTestData } from "./MarkerTestData";
import { MARKER_CONFIG } from "../../shared/constants";
import { CameraManager } from "../camera/CameraManager";
import { CameraTransform } from "../camera/types";
import { logger } from "../../core/logger/Logger";

const markerLogger = logger.getLogger('MarkerManager');

export interface RouteResult {
  path: Marker[];
  totalDistance: number;
  nodesVisited: number;
}

export class MarkerManager {
  private static _instance: MarkerManager;
  private _scene: Scene;
  private _markers: Map<string, Marker> = new Map();
  private _graph: MarkerGraph;
  private _graphRenderer: MarkerGraphRenderer;
  private _pathfinder: Pathfinder;
  private _selectedMarker: Marker | null = null;
  private _hoveredMarker: Marker | null = null;
  private _highlightedPath: Marker[] | null = null;
  private _lastClickTime: number = 0;
  private readonly _doubleClickThreshold: number = 300;
  private _graphVisible: boolean = false;
  
  private _cameraManager: CameraManager | null = null;
  private _isInitialized: boolean = false;
  private _onMarkerSelectedCallback: ((marker: Marker | null) => void) | null = null;
  private _raycasterActive: boolean = false;

  private constructor(scene: Scene) {
    this._scene = scene;
    this._graph = new MarkerGraph();
    this._graphRenderer = new MarkerGraphRenderer(scene, this._graph);
    this._pathfinder = new Pathfinder(this._graph);
    this.setupHoverDetection();
  }

  public static getInstance(scene: Scene): MarkerManager {
    if (!MarkerManager._instance) {
      MarkerManager._instance = new MarkerManager(scene);
    }
    return MarkerManager._instance;
  }

  public setCameraManager(cameraManager: CameraManager): void {
    this._cameraManager = cameraManager;
  }

  private setupHoverDetection(): void {
    const canvas = this._scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    canvas.addEventListener('mousemove', (event) => {
      if (this._raycasterActive) return;
      this._raycasterActive = true;

      requestAnimationFrame(() => {
        this.checkHover(event);
        this._raycasterActive = false;
      });
    });
  }

  private checkHover(event: MouseEvent): void {
    const canvas = this._scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / canvas.width * canvas.width;
    const y = (event.clientY - rect.top) / canvas.height * canvas.height;

    const ray = this._scene.createPickingRay(x, y, null, this._cameraManager?.camera || null);
    const pickResult = this._scene.pickWithRay(ray, (mesh) => mesh.metadata?.widget !== undefined);

    let hoveredMarker: Marker | null = null;

    if (pickResult?.hit) {
      hoveredMarker = this.findMarkerByMesh(pickResult.pickedMesh);
    }

    if (this._hoveredMarker !== hoveredMarker) {
      if (this._hoveredMarker) {
        this._hoveredMarker.setHovered(false);
        
        // Если есть подсвеченный путь, не сбрасываем подсветку графа
        if (!this._highlightedPath) {
          this._graphRenderer.resetHighlight();
        }
      }
      
      this._hoveredMarker = hoveredMarker;
      
      if (this._hoveredMarker) {
        this._hoveredMarker.setHovered(true);
        
        // Если граф видим, подсвечиваем связи
        if (this._graphVisible && !this._highlightedPath) {
          this._graphRenderer.highlightMarker(this._hoveredMarker.id);
        }
      }
    }
  }

  public async initialize(onProgress?: (progress: number) => void): Promise<void> {
    markerLogger.debug("Инициализация MarkerManager");
    
    onProgress?.(0.1);
    onProgress?.(0.3);
    this.clearAllMarkers();
    
    onProgress?.(0.6);
    this.createTestMarkers();
    
    onProgress?.(0.9);
    this._isInitialized = true;
    onProgress?.(1.0);
    
    const stats = MarkerTestData.getStats();
    markerLogger.info(
      `MarkerManager инициализирован. Маркеров: ${this._markers.size}, связей: ${this._graph.edgeCount}`
    );
    markerLogger.debug(
      `Статистика: ${stats.total} всего ` +
      `(${stats.waypoints} вейпоинтов, ${stats.markers} маркеров, ${stats.flags} флагов), ` +
      `${stats.connections} связей`
    );
    
    // Отрендерить граф (скрыто по умолчанию)
    this._graphRenderer.renderAll();
    this._graphRenderer.hide();
    
    // По умолчанию скрываем вейпоинты
    this.setWaypointsVisible(false);
  }

  /**
   * Показать/скрыть вейпоинты
   */
  public setWaypointsVisible(visible: boolean): void {
    this.getAllMarkers().forEach(marker => {
      if (marker.type === MarkerType.WAYPOINT) {
        marker.setVisible(visible);
      }
    });
    markerLogger.info(`Вейпоинты ${visible ? 'показаны' : 'скрыты'}`);
  }

  /**
   * Очистить выделение
   */
  public clearSelection(): void {
    if (this._selectedMarker) {
      this._selectedMarker.setSelected(false);
      this._selectedMarker = null;
      this._onMarkerSelectedCallback?.(null);
      
      // Если есть подсвеченный путь, не сбрасываем его
      if (!this._highlightedPath) {
        this._graphRenderer.resetHighlight();
      }
    }
  }

  /**
   * Очистить все маркеры
   */
  public clearAllMarkers(): void {
    this._markers.clear();
    this._selectedMarker = null;
    this._hoveredMarker = null;
    this._highlightedPath = null;
    this._graphRenderer.clear();
  }

  /**
   * Создать маркер
   */
  public createMarker(data: AnyMarkerData): Marker {
    const marker = new Marker(this._scene, data);
    marker.onClick = (m) => this.handleMarkerClick(m);
    marker.onDoubleClick = (m) => this.handleMarkerDoubleClick(m);
    
    this._markers.set(data.id, marker);
    this._graph.addNode(marker);
    
    // Добавляем связи из данных маркера
    this._graph.addConnectionsFromMarker(marker);
    
    return marker;
  }

  private createTestMarkers(): void {
    const testData = MarkerTestData.createAll();
    
    testData.forEach(data => {
      this.createMarker(data);
    });

    const stats = MarkerTestData.getStats();
    markerLogger.info(
      `Создано тестовых маркеров: ${stats.waypoints} вейпоинтов, ` +
      `${stats.markers} маркеров, ${stats.flags} флагов`
    );
  }

  private handleMarkerClick(marker: Marker): void {
    if (this._selectedMarker === marker) return;
    
    this._selectedMarker?.setSelected(false);
    marker.setSelected(true);
    this._selectedMarker = marker;
    this._onMarkerSelectedCallback?.(marker);
    
    markerLogger.debug(`Клик по маркеру: ${marker.id} (${marker.name})`);
  }

  private handleMarkerDoubleClick(marker: Marker): void {
    if (this._selectedMarker && this._selectedMarker !== marker) {
      this._selectedMarker.setSelected(false);
    }
    
    marker.setSelected(true);
    this._selectedMarker = marker;
    
    this.focusOnMarker(marker, { distance: 8, duration: 1.2 });
    markerLogger.debug(`Двойной клик по маркеру: ${marker.id} (${marker.name})`);
  }

  /**
   * Обновить все маркеры (вызывается каждый кадр)
   */
  public update(cameraPosition: Vector3): void {
    this._markers.forEach(marker => {
      marker.update(cameraPosition);
    });
  }

  /**
   * Обработка клика по сцене
   */
  public handleScenePick(ray: Ray): boolean {
    const pickResult = this._scene.pickWithRay(ray, (mesh) => mesh.metadata?.widget !== undefined);

    if (pickResult?.hit) {
      const hitMarker = this.findMarkerByMesh(pickResult.pickedMesh);
      
      if (hitMarker) {
        const now = Date.now();
        const timeSinceLast = now - this._lastClickTime;
        
        if (timeSinceLast < this._doubleClickThreshold) {
          hitMarker.handleDoubleClick();
          this._lastClickTime = 0;
        } else {
          hitMarker.handleClick();
          this._lastClickTime = now;
        }
        return true;
      }
    }
    
    this.clearSelection();
    return false;
  }

  private findMarkerByMesh(mesh: any): Marker | null {
    if (!mesh?.metadata?.widget) return null;
    
    for (const marker of this._markers.values()) {
      if (marker.mesh === mesh) return marker;
    }
    return null;
  }

  /**
   * Фокус на маркере
   */
  public async focusOnMarker(marker: Marker, options?: FocusOptions): Promise<void> {
    if (!this._cameraManager) {
      markerLogger.warn("CameraManager не установлен");
      return;
    }

    if (this._cameraManager.isAnimating) {
      return;
    }

    const position = marker.position;
    const distance = options?.distance || MARKER_CONFIG.focusDistance;
    const duration = options?.duration || 1.0;
    
    const targetTransform: CameraTransform = {
      alpha: this._cameraManager.camera.alpha,
      beta: this._cameraManager.camera.beta,
      radius: distance,
      target: position.clone()
    };

    await this._cameraManager['_animator'].animateTo(targetTransform, duration);
    this._cameraManager.camera.target = position.clone();
  }

  // ===== Методы для работы с графом =====

  /**
   * Переключить видимость графа
   */
  public toggleGraph(): void {
    this._graphVisible = !this._graphVisible;
    
    // Показываем/скрываем граф
    if (this._graphVisible) {
      this._graphRenderer.show();
    } else {
      this._graphRenderer.hide();
    }
    
    // Показываем/скрываем вейпоинты вместе с графом
    this.setWaypointsVisible(this._graphVisible);
    
    markerLogger.info(`Граф и вейпоинты ${this._graphVisible ? 'показаны' : 'скрыты'}`);
  }

  /**
   * Показать граф
   */
  public showGraph(): void {
    if (!this._graphVisible) {
      this.toggleGraph();
    }
  }

  /**
   * Скрыть граф
   */
  public hideGraph(): void {
    if (this._graphVisible) {
      this.toggleGraph();
    }
  }

  /**
   * Видимость графа
   */
  public get isGraphVisible(): boolean {
    return this._graphVisible;
  }

  // ===== Методы для работы с маршрутами =====

  /**
   * Найти кратчайший путь между двумя маркерами
   */
  public findPath(fromMarker: Marker, toMarker: Marker): RouteResult | null {
    const result = this._pathfinder.findShortestPath(fromMarker.id, toMarker.id);
    
    if (result) {
      markerLogger.info(`Путь найден: ${result.path.length} узлов, ${result.totalDistance.toFixed(2)}м`);
    } else {
      markerLogger.warn(`Путь не найден между ${fromMarker.name} и ${toMarker.name}`);
    }
    
    return result;
  }

  /**
   * Найти путь по ID маркеров
   */
  public findPathByIds(fromId: string, toId: string): RouteResult | null {
    return this._pathfinder.findShortestPath(fromId, toId);
  }

  /**
   * Подсветить путь на графе
   */
  public highlightPath(path: Marker[]): void {
    // Сначала сбрасываем предыдущую подсветку
    this.clearPathHighlight();
    
    this._highlightedPath = path;
    
    if (path.length >= 2) {
      const pathIds = path.map(m => m.id);
      this._graphRenderer.highlightPath(pathIds);
      
      markerLogger.debug(`Подсвечен путь из ${path.length} точек`);
    }
  }

  /**
   * Очистить подсветку пути
   */
  public clearPathHighlight(): void {
    this._highlightedPath = null;
    
    if (this._hoveredMarker && this._graphVisible) {
      this._graphRenderer.highlightMarker(this._hoveredMarker.id);
    } else {
      this._graphRenderer.resetHighlight();
    }
    
    // Очищаем маршрут в рендерере
    this._graphRenderer.clearRoute();
  }

  /**
   * Получить подсвеченный путь
   */
  public get highlightedPath(): Marker[] | null {
    return this._highlightedPath;
  }

  // ===== Геттеры и основные методы =====

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
      
      // Если удалили маркер из подсвеченного пути, очищаем подсветку
      if (this._highlightedPath?.some(m => m.id === id)) {
        this.clearPathHighlight();
      }
    }
    return removed;
  }

  public setOnMarkerSelected(callback: (marker: Marker | null) => void): void {
    this._onMarkerSelectedCallback = callback;
  }

  public get selectedMarker(): Marker | null {
    return this._selectedMarker;
  }

  public get hoveredMarker(): Marker | null {
    return this._hoveredMarker;
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get graph() {
    return this._graph;
  }

  public get pathfinder() {
    return this._pathfinder;
  }

  /**
   * Получить позиции всех точек маршрута
   */
  public getRoutePositions(path: Marker[]): Vector3[] {
    return path.map(m => m.position);
  }
}