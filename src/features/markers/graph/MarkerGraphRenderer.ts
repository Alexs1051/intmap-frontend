import { Scene, Vector3, MeshBuilder, Color3, LinesMesh, StandardMaterial, Mesh } from "@babylonjs/core";
import { MarkerGraph } from "./MarkerGraph";
import { Marker } from "../Marker";
import { IMarkerGraphRenderer, GraphRendererConfig, IMarkerManager, IMarker } from "@shared/interfaces";
import { MarkerType } from "@shared/types";
import { GRAPH_RENDERER } from "@shared/constants";

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

        const visibleIds = new Set(visibleWaypoints.map((m: IMarker) => m.id));

        // Скрываем все
        this._lines.forEach(line => line.setEnabled(false));
        this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.setEnabled(false)));

        if (visibleWaypoints.length === 0) return;

        // Показываем связи между видимыми waypoint
        let visibleCount = 0;
        visibleWaypoints.forEach((marker: IMarker) => {
            const neighbors = this.graph!.getNeighbors(marker.id);
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
        });
    }

    public renderAll(): void {
        if (!this.scene || !this.graph) return;
        this.clear();

        const waypoints = this.graph.getAllMarkers().filter((m: Marker) => m.type === MarkerType.WAYPOINT);
        const processed = new Set<string>();

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

        this.hide();
    }

    public renderForMarker(markerId: string): void {
        if (!this.scene || !this.graph) return;
        const marker = this.graph.getMarker(markerId);
        if (!marker || marker.type !== MarkerType.WAYPOINT) return;

        const neighbors = this.graph.getNeighbors(markerId);
        neighbors.filter(n => n.type === MarkerType.WAYPOINT).forEach(neighbor => {
            this.renderConnection(marker, neighbor);
        });
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
            arrows.push(arrow);
        }

        this._arrows.set(edgeId, arrows);
    }

    public highlightMarker(markerId: string): void {
        this.resetHighlight();

        if (!this.graph) return;

        const marker = this.graph.getMarker(markerId);
        if (!marker || marker.type !== MarkerType.WAYPOINT) return;

        const neighbors = this.graph.getNeighbors(markerId);
        const waypointNeighbors = neighbors.filter(n => n.type === MarkerType.WAYPOINT);

        waypointNeighbors.forEach(neighbor => {
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
    }

    public highlightPath(markerIds: string[]): void {
        this.clearRoute();
        if (markerIds.length < 2 || !this.scene || !this.graph) return;

        // Сферы на точках маршрута
        for (const markerId of markerIds) {
            if (!markerId) continue;
            const marker = this.graph.getMarker(markerId);
            if (!marker) continue;

            const sphere = MeshBuilder.CreateSphere("routeSphere", { diameter: 0.6, segments: 8 }, this.scene);
            sphere.position = new Vector3(marker.position.x, marker.position.y + 0.3, marker.position.z);

            const material = new StandardMaterial("routeSphereMat", this.scene);
            material.diffuseColor = new Color3(1, 0.3, 0);
            material.emissiveColor = new Color3(0.5, 0.1, 0);
            sphere.material = material;
            this._routeSegments.push(sphere);
        }

        // Линии между точками
        for (let i = 0; i < markerIds.length - 1; i++) {
            const fromMarker = this.graph.getMarker(markerIds[i]!);
            const toMarker = this.graph.getMarker(markerIds[i + 1]!);
            if (!fromMarker || !toMarker) continue;

            const start = new Vector3(fromMarker.position.x, fromMarker.position.y + 0.3, fromMarker.position.z);
            const end = new Vector3(toMarker.position.x, toMarker.position.y + 0.3, toMarker.position.z);
            const line = MeshBuilder.CreateLines("routeLine", { points: [start, end] }, this.scene);
            line.color = new Color3(1, 0.3, 0);
            line.alpha = 1;
            this._routeSegments.push(line);
        }
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