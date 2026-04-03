import { Scene, Vector3, MeshBuilder, Color3, LinesMesh, StandardMaterial, Mesh } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../../core/di/Container";
import { Logger } from "../../../core/logger/Logger";
import { EventBus } from "../../../core/events/EventBus";
import { EventType } from "../../../core/events/EventTypes";
import { MarkerGraph } from "./MarkerGraph";
import { Marker } from "../Marker";
import { IMarkerGraphRenderer, GraphRendererConfig } from "@shared/interfaces";

const DEFAULT_CONFIG: GraphRendererConfig = {
    lineColor: new Color3(0.3, 0.6, 1.0),
    lineThickness: 0.1,
    showArrows: true,
    arrowSize: 0.8,
    activeColor: new Color3(0.3, 0.6, 1.0),
    inactiveOpacity: 0.3,
    routeColor: new Color3(1, 0.5, 0),
    routeAnimationSpeed: 0.2
};

@injectable()
export class MarkerGraphRenderer implements IMarkerGraphRenderer {
    private logger: Logger;
    private eventBus: EventBus;
    private config: GraphRendererConfig;
    private scene?: Scene;
    private graph?: MarkerGraph;
    
    private _lines: Map<string, LinesMesh> = new Map();
    private _arrows: Map<string, LinesMesh[]> = new Map();
    private _routeSegments: Mesh[] = [];
    private _visible: boolean = false;
    private _animationFrame: number | null = null;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus
    ) {
        this.logger = logger.getLogger('MarkerGraphRenderer');
        this.eventBus = eventBus;
        this.config = { ...DEFAULT_CONFIG };
    }

    public initialize(scene: Scene, graph: MarkerGraph): void {
        this.scene = scene;
        this.graph = graph;
        this.logger.debug("Renderer initialized");
    }

    public renderAll(): void {
        if (!this.scene || !this.graph) {
            this.logger.warn("Cannot render: scene or graph not set");
            return;
        }
        
        this.clear();
        
        const markers = this.graph.getAllMarkers();
        const processed = new Set<string>();
        
        markers.forEach(marker => {
            const neighbors = this.graph!.getNeighbors(marker.id);
            
            neighbors.forEach(neighbor => {
                const edgeId = this.getEdgeId(marker.id, neighbor.id);
                if (processed.has(edgeId)) return;
                
                if (this.graph!.hasConnection(marker.id, neighbor.id)) {
                    this.renderConnection(marker, neighbor);
                    processed.add(edgeId);
                }
            });
        });
        
        this._visible = true;
        this.logger.info(`Rendered ${this._lines.size} connections`);
        this.eventBus.emit(EventType.GRAPH_RENDERED, { edges: this._lines.size });
    }

    public renderForMarker(markerId: string): void {
        if (!this.scene || !this.graph) return;
        
        const marker = this.graph.getMarker(markerId);
        if (!marker) return;
        
        const neighbors = this.graph.getNeighbors(markerId);
        neighbors.forEach(neighbor => {
            this.renderConnection(marker, neighbor);
        });
    }

    private renderConnection(marker1: Marker, marker2: Marker): void {
        const edgeId = this.getEdgeId(marker1.id, marker2.id);
        if (this._lines.has(edgeId)) return;
        
        const pos1 = marker1.position;
        const pos2 = marker2.position;
        
        const line = this.createLine(pos1, pos2, this.config.lineColor);
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
        
        const neighbors = this.graph.getNeighbors(markerId);
        
        neighbors.forEach(neighbor => {
            const edgeId = this.getEdgeId(markerId, neighbor.id);
            const line = this._lines.get(edgeId);
            if (line) {
                line.alpha = 1.0;
                line.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
            }
            
            const arrows = this._arrows.get(edgeId);
            if (arrows) {
                arrows.forEach(arrow => {
                    arrow.alpha = 1.0;
                    arrow.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
                });
            }
        });
    }

    public highlightPath(markerIds: string[]): void {
        this.clearRoute();
        
        if (markerIds.length < 2) return;
        
        this.logger.debug(`Highlighting path with ${markerIds.length} markers`);
        
        if (!this.scene) {
            this.logger.error('Scene not set in MarkerGraphRenderer!');
            return;
        }
        
        if (!this.graph) {
            this.logger.error('Graph not set in MarkerGraphRenderer!');
            return;
        }
        
        let createdCount = 0;
        
        for (const markerId of markerIds) {
            // ✅ Проверяем, что markerId существует
            if (!markerId) continue;
            
            const marker = this.graph.getMarker(markerId);
            if (!marker) {
                this.logger.warn(`Marker ${markerId} not found`);
                continue;
            }
            
            const sphere = MeshBuilder.CreateSphere("routeSphere", {
                diameter: 0.6,
                segments: 8
            }, this.scene);
            
            sphere.position = new Vector3(
                marker.position.x,
                marker.position.y + 0.3,
                marker.position.z
            );
            
            const material = new StandardMaterial("routeSphereMat", this.scene);
            material.diffuseColor = new Color3(1, 0.3, 0);
            material.emissiveColor = new Color3(0.5, 0.1, 0);
            sphere.material = material;
            
            this._routeSegments.push(sphere);
            createdCount++;
        }
        
        for (let i = 0; i < markerIds.length - 1; i++) {
            const fromId = markerIds[i];
            const toId = markerIds[i + 1];
            
            // ✅ Проверяем, что оба ID существуют
            if (!fromId || !toId) continue;
            
            const fromMarker = this.graph.getMarker(fromId);
            const toMarker = this.graph.getMarker(toId);
            
            if (!fromMarker || !toMarker) continue;
            
            const start = new Vector3(
                fromMarker.position.x,
                fromMarker.position.y + 0.3,
                fromMarker.position.z
            );
            const end = new Vector3(
                toMarker.position.x,
                toMarker.position.y + 0.3,
                toMarker.position.z
            );
            
            const points = [start, end];
            const line = MeshBuilder.CreateLines("routeLine", { points }, this.scene);
            line.color = new Color3(1, 0.3, 0);
            line.alpha = 1;
            
            this._routeSegments.push(line);
            createdCount++;
        }
        
        this.logger.debug(`Created ${createdCount} route elements (${this._routeSegments.length} total)`);
    }

    public resetHighlight(): void {
        this._lines.forEach(line => {
            line.alpha = this.config.inactiveOpacity;
            line.color = new Color3(this.config.lineColor.r, this.config.lineColor.g, this.config.lineColor.b);
        });
        
        this._arrows.forEach(arrows => {
            arrows.forEach(arrow => {
                arrow.alpha = 0.8;
                arrow.color = new Color3(this.config.activeColor.r, this.config.activeColor.g, this.config.activeColor.b);
            });
        });
    }

    public clearRoute(): void {
        if (this._animationFrame !== null) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
        
        this._routeSegments.forEach(segment => {
            try {
                segment.dispose();
            } catch (e) {
                // ignore
            }
        });
        this._routeSegments = [];
    }

    public show(): void {
        this._lines.forEach(line => line.setEnabled(true));
        this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.setEnabled(true)));
        this._visible = true;
        this.eventBus.emit(EventType.GRAPH_SHOWN);
    }

    public hide(): void {
        this._lines.forEach(line => line.setEnabled(false));
        this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.setEnabled(false)));
        this._visible = false;
        this.eventBus.emit(EventType.GRAPH_HIDDEN);
    }

    public clear(): void {
        this.clearRoute();
        
        this._lines.forEach(line => line.dispose());
        this._lines.clear();
        
        this._arrows.forEach(arrows => arrows.forEach(arrow => arrow.dispose()));
        this._arrows.clear();
        
        this._visible = false;
        this.logger.debug("Renderer cleared");
    }

    private getEdgeId(id1: string, id2: string): string {
        return [id1, id2].sort().join('_');
    }

    public get isVisible(): boolean {
        return this._visible;
    }
}