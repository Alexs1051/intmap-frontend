import { Scene, Vector3, MeshBuilder, Color3, LinesMesh, StandardMaterial, Mesh } from "@babylonjs/core";
import { MarkerGraph } from "./marker-graph";
import { Marker } from "../marker";
import { IMarkerGraphRenderer, GraphRendererConfig, IMarkerManager, IMarker } from "@shared/interfaces";
import { MarkerType } from "@shared/types";
import { GRAPH_RENDERER, WALL_CONFIG } from "@shared/constants";

const DEFAULT_CONFIG: GraphRendererConfig = {
    lineColor: new Color3(GRAPH_RENDERER.LINE_COLOR.r, GRAPH_RENDERER.LINE_COLOR.g, GRAPH_RENDERER.LINE_COLOR.b),
    lineThickness: GRAPH_RENDERER.LINE_THICKNESS,
    showArrows: GRAPH_RENDERER.SHOW_ARROWS,
    arrowSize: GRAPH_RENDERER.ARROW_SIZE,
    activeColor: new Color3(GRAPH_RENDERER.ACTIVE_COLOR.r, GRAPH_RENDERER.ACTIVE_COLOR.g, GRAPH_RENDERER.ACTIVE_COLOR.b),
    inactiveOpacity: GRAPH_RENDERER.INACTIVE_OPACITY,
    routeColor: new Color3(GRAPH_RENDERER.ROUTE_COLOR.r, GRAPH_RENDERER.ROUTE_COLOR.g, GRAPH_RENDERER.ROUTE_COLOR.b),
    routeAnimationSpeed: GRAPH_RENDERER.ROUTE_ANIMATION_SPEED
};

/**
 * Рендерер графа маркеров
 * Отрисовывает линии связей между waypoint и стрелки направления
 */
export class MarkerGraphRenderer implements IMarkerGraphRenderer {
    private scene?: Scene;
    private graph?: MarkerGraph;
    private markerManager?: IMarkerManager;
    private config: GraphRendererConfig = DEFAULT_CONFIG;

    private _lines: Map<string, LinesMesh> = new Map();
    private _arrows: Map<string, LinesMesh[]> = new Map();
    private _routeSegments: Mesh[] = [];
    private _visible: boolean = false;

    public initialize(scene: Scene, graph: MarkerGraph): void {
        this.scene = scene;
        this.graph = graph;
    }

    public setMarkerManager(markerManager: IMarkerManager): void {
        this.markerManager = markerManager;
    }

    /**
     * Обновить видимость графа
     */
    public updateVisibility(): void {
        if (!this._visible || !this.markerManager || !this.graph) {
            this.hide();
            return;
        }

        const allMarkers = this.markerManager.getAllMarkers();
        const visibleWaypoints = allMarkers.filter((m: IMarker) =>
            m.type === MarkerType.WAYPOINT && m.isVisible
        );
        const visibleMarkers = allMarkers.filter((m: IMarker) =>
            m.type !== MarkerType.WAYPOINT && m.isVisible
        );

        const visibleIds = new Set([
            ...visibleWaypoints.map((m: IMarker) => m.id),
            ...visibleMarkers.map((m: IMarker) => m.id)
        ]);

        // Скрываем все
        this._lines.forEach(line => line.setEnabled(false));
        this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.setEnabled(false)));

        if (visibleWaypoints.length === 0) return;

        // Показываем связи между видимыми waypoint
        let visibleCount = 0;
        visibleWaypoints.forEach((marker: IMarker) => {
            const neighbors = this.graph!.getNeighbors(marker.id);

            // Связи waypoint-waypoint
            const waypointNeighbors = neighbors.filter((n: Marker) =>
                n.type === MarkerType.WAYPOINT && visibleIds.has(n.id)
            );

            waypointNeighbors.forEach(neighbor => {
                const edgeId = this.getEdgeId(marker.id, neighbor.id);
                const line = this._lines.get(edgeId);
                if (line) { line.setEnabled(true); visibleCount++; }
                const arrows = this._arrows.get(edgeId);
                if (arrows) arrows.forEach(arrow => arrow.setEnabled(true));
            });

            // Связи waypoint-marker/flag
            const targetNeighbors = neighbors.filter((n: Marker) =>
                n.type !== MarkerType.WAYPOINT && visibleIds.has(n.id)
            );

            targetNeighbors.forEach(neighbor => {
                const edgeId = this.getEdgeId(marker.id, neighbor.id);
                const line = this._lines.get(edgeId);
                if (line) { line.setEnabled(true); visibleCount++; }
            });
        });
    }

    public renderAll(): void {
        if (!this.scene || !this.graph) return;
        this.clear();

        const markers = this.graph.getAllMarkers();
        const waypoints = markers.filter((m: Marker) => m.type === MarkerType.WAYPOINT);
        const processed = new Set<string>();

        // Рендерим связи между вейпоинтами
        waypoints.forEach(marker => {
            const neighbors = this.graph!.getNeighbors(marker.id);
            const waypointNeighbors = neighbors.filter(n => n.type === MarkerType.WAYPOINT);

            waypointNeighbors.forEach(neighbor => {
                const edgeId = this.getEdgeId(marker.id, neighbor.id);
                if (processed.has(edgeId)) return;
                if (this.graph!.hasConnection(marker.id, neighbor.id)) {
                    this.renderConnection(marker, neighbor);
                    processed.add(edgeId);
                }
            });
        });

        // Рендерим связи от вейпоинтов до маркеров/флагов
        waypoints.forEach(waypoint => {
            const neighbors = this.graph!.getNeighbors(waypoint.id);
            const targetNeighbors = neighbors.filter(n => n.type !== MarkerType.WAYPOINT);

            targetNeighbors.forEach(target => {
                const edgeId = this.getEdgeId(waypoint.id, target.id);
                if (processed.has(edgeId)) return;
                if (this.graph!.hasConnection(waypoint.id, target.id)) {
                    this.renderConnection(waypoint, target);
                    processed.add(edgeId);
                }
            });
        });

        this.hide();
    }

    public renderForMarker(markerId: string): void {
        if (!this.scene || !this.graph) return;
        const marker = this.graph.getMarker(markerId);
        if (!marker) return;

        const neighbors = this.graph.getNeighbors(markerId);

        // Для вейпоинтов - рендерим все связи (и до вейпоинтов, и до маркеров/флагов)
        if (marker.type === MarkerType.WAYPOINT) {
            neighbors.forEach(neighbor => {
                this.renderConnection(marker, neighbor);
            });
        } else {
            // Для маркеров/флагов - рендерим связь только с вейпоинтами
            const waypointNeighbors = neighbors.filter(n => n.type === MarkerType.WAYPOINT);
            waypointNeighbors.forEach(neighbor => {
                this.renderConnection(neighbor, marker);
            });
        }
    }

    private renderConnection(marker1: Marker, marker2: Marker): void {
        const edgeId = this.getEdgeId(marker1.id, marker2.id);
        if (this._lines.has(edgeId)) return;

        const line = this.createLine(marker1.position, marker2.position, this.config.lineColor);
        this._lines.set(edgeId, line);

        if (this.config.showArrows) {
            this.createArrows(marker1, marker2, edgeId);
        }
    }

    private createLine(start: Vector3, end: Vector3, color: Color3): LinesMesh {
        if (!this.scene) throw new Error("Scene not set");

        const points = [start.clone(), end.clone()];
        const line = MeshBuilder.CreateLines("graphLine", { points }, this.scene);
        line.color = new Color3(color.r, color.g, color.b);
        line.alpha = this.config.inactiveOpacity;

        // Назначаем rendering group поверх стен
        line.renderingGroupId = WALL_CONFIG.MARKER_RENDERING_GROUP;

        return line;
    }

    private createArrows(marker1: Marker, marker2: Marker, edgeId: string): void {
        if (!this.scene) return;

        const pos1 = marker1.position;
        const pos2 = marker2.position;
        const direction = Vector3.Normalize(pos2.subtract(pos1));
        const distance = Vector3.Distance(pos1, pos2);
        const midPoint = pos1.add(direction.scale(distance * 0.6));

        const up = new Vector3(0, 1, 0);
        const perpendicular = Vector3.Cross(direction, up).normalize();
        const arrowSize = this.config.arrowSize;

        const arrows: LinesMesh[] = [];

        const hasTwoWay = this.graph?.hasConnection(marker1.id, marker2.id) &&
            this.graph?.hasConnection(marker2.id, marker1.id);

        if (hasTwoWay) {
            const leftOffset = perpendicular.scale(0.3);
            const arrowPos1 = midPoint.add(leftOffset);

            const arrow1Points = [
                arrowPos1.clone(),
                arrowPos1.add(direction.scale(-arrowSize)).add(perpendicular.scale(arrowSize * 0.5)),
                arrowPos1.clone(),
                arrowPos1.add(direction.scale(-arrowSize)).add(perpendicular.scale(-arrowSize * 0.5))
            ];

            const arrow1 = MeshBuilder.CreateLineSystem("arrow1", { lines: [arrow1Points] }, this.scene);
            arrow1.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
            arrow1.alpha = 0.8;
            arrow1.renderingGroupId = WALL_CONFIG.MARKER_RENDERING_GROUP;
            arrows.push(arrow1);

            const rightOffset = perpendicular.scale(-0.3);
            const arrowPos2 = midPoint.add(rightOffset);

            const arrow2Points = [
                arrowPos2.clone(),
                arrowPos2.add(direction.scale(arrowSize)).add(perpendicular.scale(arrowSize * 0.5)),
                arrowPos2.clone(),
                arrowPos2.add(direction.scale(arrowSize)).add(perpendicular.scale(-arrowSize * 0.5))
            ];

            const arrow2 = MeshBuilder.CreateLineSystem("arrow2", { lines: [arrow2Points] }, this.scene);
            arrow2.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
            arrow2.alpha = 0.8;
            arrow2.renderingGroupId = WALL_CONFIG.MARKER_RENDERING_GROUP;
            arrows.push(arrow2);
        } else {
            const arrowPoints = [
                midPoint.clone(),
                midPoint.add(direction.scale(-arrowSize)).add(perpendicular.scale(arrowSize * 0.5)),
                midPoint.clone(),
                midPoint.add(direction.scale(-arrowSize)).add(perpendicular.scale(-arrowSize * 0.5))
            ];

            const arrow = MeshBuilder.CreateLineSystem("arrow", { lines: [arrowPoints] }, this.scene);
            arrow.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
            arrow.alpha = 0.8;
            arrow.renderingGroupId = WALL_CONFIG.MARKER_RENDERING_GROUP;
            arrows.push(arrow);
        }

        this._arrows.set(edgeId, arrows);
    }

    public highlightMarker(markerId: string): void {
        this.resetHighlight();

        if (!this.graph) return;

        const marker = this.graph.getMarker(markerId);
        if (!marker) return;

        const neighbors = this.graph.getNeighbors(markerId);

        // Для вейпоинтов - подсвечиваем все связи
        if (marker.type === MarkerType.WAYPOINT) {
            neighbors.forEach(neighbor => {
                const edgeId = this.getEdgeId(markerId, neighbor.id);
                const line = this._lines.get(edgeId);
                if (line && line.isEnabled()) {
                    line.alpha = 1.0;
                    line.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
                }

                const arrows = this._arrows.get(edgeId);
                if (arrows) {
                    arrows.forEach(arrow => {
                        if (arrow.isEnabled()) {
                            arrow.alpha = 1.0;
                            arrow.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
                        }
                    });
                }
            });
        } else {
            // Для маркеров/флагов - подсвечиваем только связи с вейпоинтами
            const waypointNeighbors = neighbors.filter(n => n.type === MarkerType.WAYPOINT);
            waypointNeighbors.forEach(neighbor => {
                const edgeId = this.getEdgeId(markerId, neighbor.id);
                const line = this._lines.get(edgeId);
                if (line && line.isEnabled()) {
                    line.alpha = 1.0;
                    line.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
                }
            });
        }
    }

    public highlightPath(markerIds: string[]): void {
        this.clearRoute();
        if (markerIds.length < 2 || !this.scene || !this.graph) return;

        // Собираем точки маршрута
        const rawPoints: Vector3[] = [];
        const firstMarker = this.graph.getMarker(markerIds[0]!);
        const lastMarker = this.graph.getMarker(markerIds[markerIds.length - 1]!);

        if (!firstMarker || !lastMarker) return;

        // Создаем точки пути с поднятием по Y
        for (const markerId of markerIds) {
            if (!markerId) continue;
            const marker = this.graph.getMarker(markerId);
            if (!marker) continue;

            rawPoints.push(
                new Vector3(marker.position.x, marker.position.y + 0.5, marker.position.z)
            );
        }

        // Сглаживаем кривую с помощью CatmullRom сплайна
        const pathPoints = this.smoothPath(rawPoints, 10); // 10 сегментов между точками

        // Создаём трубу (tube) для маршрута - красивый объёмный путь
        const routeTube = MeshBuilder.CreateTube("routeTube", {
            path: pathPoints,
            radius: 0.15,
            tessellation: 12,
            cap: 2 // 2 = CAP_ALL
        }, this.scene);

        // Настраиваем материал трубы с градиентом
        const tubeMaterial = new StandardMaterial("routeTubeMat", this.scene);
        tubeMaterial.diffuseColor = new Color3(1, 0.5, 0); // Оранжевый
        tubeMaterial.emissiveColor = new Color3(0.3, 0.15, 0); // Свечение
        tubeMaterial.alpha = 0.9;
        routeTube.material = tubeMaterial;
        routeTube.renderingGroupId = WALL_CONFIG.MARKER_RENDERING_GROUP;
        this._routeSegments.push(routeTube);

        // Сфера в начальной точке ("Отсюда")
        const startSphere = MeshBuilder.CreateSphere("routeStartSphere", {
            diameter: 0.8,
            segments: 16
        }, this.scene);
        if (pathPoints.length > 0) {
            startSphere.position = pathPoints[0]!.clone();
        }

        const sphereMaterial = new StandardMaterial("startSphereMat", this.scene);
        sphereMaterial.diffuseColor = new Color3(0, 1, 0); // Зелёный
        sphereMaterial.emissiveColor = new Color3(0, 0.3, 0); // Свечение
        startSphere.material = sphereMaterial;
        startSphere.renderingGroupId = WALL_CONFIG.MARKER_RENDERING_GROUP;
        this._routeSegments.push(startSphere);

        // Конус в конечной точке ("Сюда")
        const endCone = MeshBuilder.CreateCylinder("routeEndCone", {
            height: 1.0,
            diameterBottom: 0.6,
            diameterTop: 0.0,
            tessellation: 16
        }, this.scene);

        if (pathPoints.length > 0) {
            const lastPoint = pathPoints[pathPoints.length - 1]!;
            endCone.position = new Vector3(lastPoint.x, lastPoint.y, lastPoint.z);

            // Разворачиваем конус в направлении последней точки маршрута
            // Вычисляем направление (от предпоследней точки к последней)
            if (pathPoints.length >= 2) {
                const prevPoint = pathPoints[pathPoints.length - 2]!;
                const direction = Vector3.Normalize(lastPoint.subtract(prevPoint));

                // Направление по умолчанию у цилиндра - вверх (Y+)
                // Нужно повернуть конус так, чтобы он смотрел вдоль direction
                // Используем LookAt или кватернион
                const up = new Vector3(0, 1, 0);
                const rotationAxis = Vector3.Cross(up, direction);
                const rotationAngle = Math.acos(Vector3.Dot(up, direction));

                if (rotationAxis.length() > 0.001) {
                    const rotation = rotationAxis.normalize().scale(rotationAngle);
                    endCone.rotation.x = rotation.x;
                    endCone.rotation.y = rotation.y;
                    endCone.rotation.z = rotation.z;
                }
            }
        }

        const coneMaterial = new StandardMaterial("endConeMat", this.scene);
        coneMaterial.diffuseColor = new Color3(1, 0, 0); // Красный
        coneMaterial.emissiveColor = new Color3(0.3, 0, 0); // Свечение
        endCone.material = coneMaterial;
        endCone.renderingGroupId = WALL_CONFIG.MARKER_RENDERING_GROUP;
        this._routeSegments.push(endCone);

        // Анимация пульсации для всей трубы
        this.animateRoute(routeTube, startSphere, endCone);
    }

    /**
     * Сглаживает путь с помощью CatmullRom сплайна
     * @param points Исходные точки
     * @param segmentsPerSegment Количество сегментов сглаживания между каждыми двумя точками
     * @returns Сглаженный путь
     */
    private smoothPath(points: Vector3[], segmentsPerSegment: number): Vector3[] {
        if (points.length < 2) return points;

        const smoothed: Vector3[] = [];

        // CatmullRom сплайн
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)]!;
            const p1 = points[i]!;
            const p2 = points[i + 1]!;
            const p3 = points[Math.min(points.length - 1, i + 2)]!;

            for (let t = 0; t <= segmentsPerSegment; t++) {
                const s = t / segmentsPerSegment;

                // CatmullRom интерполяция
                const s2 = s * s;
                const s3 = s2 * s;

                const point = new Vector3(
                    0.5 * ((2 * p1.x) + (-p0.x + p2.x) * s +
                        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
                        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3),
                    0.5 * ((2 * p1.y) + (-p0.y + p2.y) * s +
                        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
                        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3),
                    0.5 * ((2 * p1.z) + (-p0.z + p2.z) * s +
                        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * s2 +
                        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * s3)
                );

                // Добавляем точку, избегая дубликатов
                if (smoothed.length === 0 || !smoothed[smoothed.length - 1]!.equals(point)) {
                    smoothed.push(point);
                }
            }
        }

        return smoothed;
    }

    /**
     * Анимация маршрута - пульсация и свечение
     */
    private animateRoute(tube: any, startSphere: any, endCone: any): void {
        if (!this.scene) return;

        const startTime = Date.now();
        const duration = 2000; // 2 секунды на цикл

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = (elapsed % duration) / duration;

            // Пульация emissive
            const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

            if (tube.material) {
                const emissive = tube.material.emissiveColor;
                if (emissive) {
                    emissive.r = 0.3 + pulse * 0.2;
                    emissive.g = 0.15 + pulse * 0.1;
                }
            }

            // Пульация сферы
            if (startSphere.material) {
                const emissive = startSphere.material.emissiveColor;
                if (emissive) {
                    emissive.g = 0.3 + pulse * 0.2;
                }
                startSphere.scaling = new Vector3(
                    1 + pulse * 0.1,
                    1 + pulse * 0.1,
                    1 + pulse * 0.1
                );
            }

            // Пульация конуса
            if (endCone.material) {
                const emissive = endCone.material.emissiveColor;
                if (emissive) {
                    emissive.r = 0.3 + pulse * 0.2;
                }
                endCone.scaling = new Vector3(
                    1 + pulse * 0.1,
                    1 + pulse * 0.1,
                    1 + pulse * 0.1
                );
            }

            // Продолжаем анимацию пока маршрут видим
            if (this._routeSegments.length > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    public resetHighlight(): void {
        this._lines.forEach(line => {
            if (line.isEnabled()) {
                line.alpha = this.config.inactiveOpacity;
                line.color = new Color3(this.config.lineColor.r, this.config.lineColor.g, this.config.lineColor.b);
            }
        });

        this._arrows.forEach(arrows => {
            arrows.forEach(arrow => {
                if (arrow.isEnabled()) {
                    arrow.alpha = 0.8;
                    arrow.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
                }
            });
        });
    }

    public clearRoute(): void {
        this._routeSegments.forEach(segment => { try { segment.dispose(); } catch { } });
        this._routeSegments = [];
    }

    public show(): void {
        this._visible = true;
        this.updateVisibility();
    }

    public hide(): void {
        this._lines.forEach(line => line.setEnabled(false));
        this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.setEnabled(false)));
        this._visible = false;
    }

    public clear(): void {
        this.clearRoute();
        this._lines.forEach(line => line.dispose());
        this._lines.clear();
        this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.dispose()));
        this._arrows.clear();
        this._visible = false;
    }

    private getEdgeId(id1: string, id2: string): string {
        return [id1, id2].sort().join('_');
    }

    public get isVisible(): boolean {
        return this._visible;
    }
}