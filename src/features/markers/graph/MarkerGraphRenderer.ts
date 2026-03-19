import { Scene, Vector3, MeshBuilder, Color3, LinesMesh, TransformNode } from "@babylonjs/core";
import { MarkerGraph } from "./MarkerGraph";
import { Marker } from "../Marker";
import { ConnectionDirection } from "../types";
import { logger } from "../../../core/logger/Logger";

const rendererLogger = logger.getLogger('MarkerGraphRenderer');

export interface GraphRendererOptions {
  lineColor?: Color3;
  lineThickness?: number;
  showArrows?: boolean;
  arrowSize?: number;
  waypointColor?: Color3;
  markerColor?: Color3;
  flagColor?: Color3;
  activeColor?: Color3;
  inactiveOpacity?: number;
  routeColor?: Color3;
  routeAnimationSpeed?: number;
}

export class MarkerGraphRenderer {
  private _scene: Scene;
  private _graph: MarkerGraph;
  private _lines: Map<string, LinesMesh> = new Map();
  private _arrows: Map<string, LinesMesh[]> = new Map();
  private _routeSegments: LinesMesh[] = []; // Отдельные линии для маршрута
  private _options: Required<GraphRendererOptions>;
  private _visible: boolean = false;
  private _animationFrame: number | null = null;
  private _routeAnimationTime: number = 0;
  
  // Цвета по умолчанию
  private readonly DEFAULT_OPTIONS: Required<GraphRendererOptions> = {
    lineColor: new Color3(0.3, 0.6, 1.0),
    lineThickness: 0.1,
    showArrows: true,
    arrowSize: 0.8,
    waypointColor: new Color3(0.8, 0.2, 0.2),
    markerColor: new Color3(0.2, 0.6, 0.3),
    flagColor: new Color3(0.2, 0.3, 0.8),
    activeColor: new Color3(0.3, 0.6, 1.0),
    inactiveOpacity: 0.3,
    routeColor: new Color3(1, 0.5, 0),
    routeAnimationSpeed: 0.2 // В 5 раз медленнее (было 1.0)
  };

  constructor(scene: Scene, graph: MarkerGraph, options?: GraphRendererOptions) {
    this._scene = scene;
    this._graph = graph;
    this._options = { ...this.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Отрендерить все связи в графе
   */
  public renderAll(): void {
    this.clear();
    
    const markers = this._graph.getAllMarkers();
    const processed = new Set<string>();
    
    markers.forEach(marker => {
      const neighbors = this._graph.getNeighbors(marker.id);
      
      neighbors.forEach(neighbor => {
        const edgeId = this.getEdgeId(marker.id, neighbor.id);
        if (processed.has(edgeId)) return;
        
        const hasConnection = this._graph.hasConnection(marker.id, neighbor.id);
        if (hasConnection) {
          this.renderConnection(marker, neighbor);
          processed.add(edgeId);
        }
      });
    });
    
    this._visible = true;
    rendererLogger.info(`Отрендерено ${this._lines.size} связей между маркерами`);
  }

  /**
   * Отрендерить связи для конкретного маркера
   */
  public renderForMarker(markerId: string): void {
    const marker = this._graph.getMarker(markerId);
    if (!marker) return;
    
    const neighbors = this._graph.getNeighbors(markerId);
    
    neighbors.forEach(neighbor => {
      this.renderConnection(marker, neighbor);
    });
  }

  /**
   * Отрендерить конкретную связь между двумя маркерами
   */
  private renderConnection(marker1: Marker, marker2: Marker): void {
    const edgeId = this.getEdgeId(marker1.id, marker2.id);
    if (this._lines.has(edgeId)) return;
    
    const pos1 = marker1.position;
    const pos2 = marker2.position;
    
    // Создаём линию
    const line = this.createLine(pos1, pos2, this._options.lineColor);
    this._lines.set(edgeId, line);
    
    // Создаём стрелки, если нужно
    if (this._options.showArrows) {
      this.createMinimalArrows(marker1, marker2, edgeId);
    }
    
    rendererLogger.debug(`Создана связь: ${marker1.id} <-> ${marker2.id}`);
  }

  /**
   * Создать линию между двумя точками
   */
  private createLine(start: Vector3, end: Vector3, color: Color3): LinesMesh {
    const points = [start.clone(), end.clone()];
    
    const line = MeshBuilder.CreateLines("graphLine", {
      points: points,
      updatable: true
    }, this._scene);
    
    line.color = color.clone();
    line.alpha = this._options.inactiveOpacity;
    
    return line;
  }

  /**
   * Создать минималистичные стрелки
   */
  private createMinimalArrows(marker1: Marker, marker2: Marker, edgeId: string): void {
    const pos1 = marker1.position;
    const pos2 = marker2.position;
    const direction = Vector3.Normalize(pos2.subtract(pos1));
    const distance = Vector3.Distance(pos1, pos2);
    
    // Позиция для стрелки (ближе к середине)
    const midPoint = pos1.add(direction.scale(distance * 0.6));
    
    const arrows: LinesMesh[] = [];
    
    // Создаём перпендикулярное направление для стрелки
    const up = new Vector3(0, 1, 0);
    const perpendicular = Vector3.Cross(direction, up).normalize();
    
    // Размер стрелки
    const arrowSize = 0.8;
    
    // Проверяем направление связи
    const hasTwoWay = this._graph.hasConnection(marker1.id, marker2.id) && 
                      this._graph.hasConnection(marker2.id, marker1.id);
    
    if (hasTwoWay) {
      // Двусторонняя связь - две стрелки в разные стороны
      
      // Стрелка от marker1 к marker2 (немного смещена влево)
      const leftOffset = perpendicular.scale(0.3);
      const arrowPos1 = midPoint.add(leftOffset);
      
      const arrow1Points = [
        arrowPos1.clone(),
        arrowPos1.add(direction.scale(-arrowSize)).add(perpendicular.scale(arrowSize * 0.5)),
        arrowPos1.clone(),
        arrowPos1.add(direction.scale(-arrowSize)).add(perpendicular.scale(-arrowSize * 0.5))
      ];
      
      const arrow1 = MeshBuilder.CreateLineSystem("arrow1", {
        lines: [arrow1Points]
      }, this._scene);
      arrow1.color = this._options.activeColor.clone();
      arrow1.alpha = 0.8;
      arrows.push(arrow1);
      
      // Стрелка от marker2 к marker1 (немного смещена вправо)
      const rightOffset = perpendicular.scale(-0.3);
      const arrowPos2 = midPoint.add(rightOffset);
      
      const arrow2Points = [
        arrowPos2.clone(),
        arrowPos2.add(direction.scale(arrowSize)).add(perpendicular.scale(arrowSize * 0.5)),
        arrowPos2.clone(),
        arrowPos2.add(direction.scale(arrowSize)).add(perpendicular.scale(-arrowSize * 0.5))
      ];
      
      const arrow2 = MeshBuilder.CreateLineSystem("arrow2", {
        lines: [arrow2Points]
      }, this._scene);
      arrow2.color = this._options.activeColor.clone();
      arrow2.alpha = 0.8;
      arrows.push(arrow2);
      
    } else {
      // Односторонняя связь - одна стрелка от marker1 к marker2
      const arrowPoints = [
        midPoint.clone(),
        midPoint.add(direction.scale(-arrowSize)).add(perpendicular.scale(arrowSize * 0.5)),
        midPoint.clone(),
        midPoint.add(direction.scale(-arrowSize)).add(perpendicular.scale(-arrowSize * 0.5))
      ];
      
      const arrow = MeshBuilder.CreateLineSystem("arrow", {
        lines: [arrowPoints]
      }, this._scene);
      arrow.color = this._options.activeColor.clone();
      arrow.alpha = 0.8;
      arrows.push(arrow);
    }
    
    this._arrows.set(edgeId, arrows);
  }

  /**
   * Получить уникальный ID для ребра
   */
  private getEdgeId(id1: string, id2: string): string {
    return [id1, id2].sort().join('_');
  }

  /**
   * Показать все связи
   */
  public show(): void {
    this._lines.forEach(line => line.setEnabled(true));
    this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.setEnabled(true)));
    this._visible = true;
  }

  /**
   * Скрыть все связи
   */
  public hide(): void {
    this._lines.forEach(line => line.setEnabled(false));
    this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.setEnabled(false)));
    this._visible = false;
  }

  /**
   * Подсветить связи для конкретного маркера
   */
  public highlightMarker(markerId: string): void {
    // Сбрасываем все линии до неактивного состояния
    this._lines.forEach(line => {
      line.alpha = this._options.inactiveOpacity;
    });
    
    this._arrows.forEach(arrows => {
      arrows.forEach(arrow => {
        arrow.alpha = this._options.inactiveOpacity;
      });
    });
    
    // Подсвечиваем линии, связанные с маркером
    const neighbors = this._graph.getNeighbors(markerId);
    
    neighbors.forEach(neighbor => {
      const edgeId = this.getEdgeId(markerId, neighbor.id);
      const line = this._lines.get(edgeId);
      if (line) {
        line.alpha = 1.0;
        line.color = this._options.activeColor.clone();
      }
      
      const arrows = this._arrows.get(edgeId);
      if (arrows) {
        arrows.forEach(arrow => {
          arrow.alpha = 1.0;
          arrow.color = this._options.activeColor.clone();
        });
      }
    });
  }

  /**
   * Сбросить подсветку
   */
  public resetHighlight(): void {
    this._lines.forEach(line => {
      line.alpha = this._options.inactiveOpacity;
      line.color = this._options.lineColor.clone();
    });
    
    this._arrows.forEach(arrows => {
      arrows.forEach(arrow => {
        arrow.alpha = 0.8;
        arrow.color = this._options.activeColor.clone();
      });
    });
  }

  /**
   * Подсветить путь на графе отдельными линиями
   */
  public highlightPath(markerIds: string[]): void {
    // Очищаем предыдущий маршрут
    this.clearRoute();
    
    if (markerIds.length < 2) return;
    
    rendererLogger.info(`Подсветка пути из ${markerIds.length} точек`);
    
    // Создаём отдельные линии для маршрута
    for (let i = 0; i < markerIds.length - 1; i++) {
      const fromId = markerIds[i];
      const toId = markerIds[i + 1];
      const fromMarker = this._graph.getMarker(fromId);
      const toMarker = this._graph.getMarker(toId);
      
      if (!fromMarker || !toMarker) continue;
      
      const pos1 = fromMarker.position;
      const pos2 = toMarker.position;
      
      // Создаём изогнутую линию для сегмента маршрута
      const segmentPoints = this.createBezierPoints(pos1, pos2, 0.5);
      
      const segmentLine = MeshBuilder.CreateLineSystem("routeSegment", {
        lines: [segmentPoints]
      }, this._scene);
      
      segmentLine.color = this._options.routeColor.clone();
      segmentLine.alpha = 1.0;
      
      this._routeSegments.push(segmentLine);
    }
    
    // Запускаем анимацию маршрута
    this.startRouteAnimation();
  }

  /**
   * Создать изогнутую линию между двумя точками (эффект)
   */
  private createBezierPoints(start: Vector3, end: Vector3, height: number = 0.5): Vector3[] {
    const points: Vector3[] = [];
    const steps = 30;
    
    const direction = end.subtract(start);
    const midPoint = start.add(direction.scale(0.5));
    
    // Добавляем изгиб вверх
    midPoint.y += height;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Квадратичная кривая Безье
      const x = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * midPoint.x + Math.pow(t, 2) * end.x;
      const y = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * midPoint.y + Math.pow(t, 2) * end.y;
      const z = Math.pow(1 - t, 2) * start.z + 2 * (1 - t) * t * midPoint.z + Math.pow(t, 2) * end.z;
      
      points.push(new Vector3(x, y, z));
    }
    
    return points;
  }

  /**
   * Запустить анимацию маршрута (медленное мигание)
   */
  private startRouteAnimation(): void {
    // Останавливаем предыдущую анимацию
    if (this._animationFrame !== null) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    
    this._routeAnimationTime = 0;
    
    const animate = () => {
      if (this._routeSegments.length === 0) return;
      
      this._routeAnimationTime += 0.02; // Очень медленно
      
      // Медленное мигание (синусоида от 0.7 до 1.0)
      const pulse = 0.7 + Math.sin(this._routeAnimationTime * 2) * 0.15;
      
      this._routeSegments.forEach(segment => {
        segment.alpha = pulse;
      });
      
      this._animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Очистить маршрут
   */
  public clearRoute(): void {
    // Останавливаем анимацию
    if (this._animationFrame !== null) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    
    // Удаляем сегменты маршрута
    this._routeSegments.forEach(segment => segment.dispose());
    this._routeSegments = [];
    
    rendererLogger.debug("Маршрут очищен");
  }

  /**
   * Очистить все линии и стрелки
   */
  public clear(): void {
    this.clearRoute();
    
    this._lines.forEach(line => line.dispose());
    this._lines.clear();
    
    this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.dispose()));
    this._arrows.clear();
    
    this._visible = false;
  }

  /**
   * Видимость рендерера
   */
  public get isVisible(): boolean {
    return this._visible;
  }
}