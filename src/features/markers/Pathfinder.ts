import { Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { EventBus } from "../../core/events/EventBus";
import { EventType } from "../../core/events/EventTypes";
import { Marker } from "./Marker";
import { MarkerGraph } from "./graph/MarkerGraph";
import { PathNode, PathResult } from "@shared/types";
import { RoutePoint, RouteResult, RouteSegment } from "@shared/types/dto";

@injectable()
export class Pathfinder {
    private logger: Logger;
    private eventBus: EventBus;
    private graph: MarkerGraph;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus,
        @inject(TYPES.MarkerGraph) graph: MarkerGraph
    ) {
        this.logger = logger.getLogger('Pathfinder');
        this.eventBus = eventBus;
        this.graph = graph;
    }

    /**
     * Найти кратчайший путь между двумя маркерами
     */
    public findShortestPath(startId: string, endId: string): PathResult | null {
        this.logger.debug(`Finding path from ${startId} to ${endId}`);
        this.eventBus.emit(EventType.ROUTE_CALCULATION_START, { startId, endId });

        const startMarker = this.graph.getMarker(startId);
        const endMarker = this.graph.getMarker(endId);

        if (!startMarker || !endMarker) {
            this.logger.warn(`Start or end marker not found`);
            this.eventBus.emit(EventType.ROUTE_CALCULATION_ERROR, { error: 'Marker not found' });
            return null;
        }

        const graphPath = this.graph.findPath(startId, endId);
        
        if (!graphPath) {
            this.logger.warn(`No path found between ${startMarker.name} and ${endMarker.name}`);
            this.eventBus.emit(EventType.ROUTE_CALCULATION_ERROR, { error: 'No path found' });
            return null;
        }

        const path: PathNode[] = [];
        let accumulatedDistance = 0;
        
        for (let i = 0; i < graphPath.path.length; i++) {
            const id = graphPath.path[i];
            
            if (!id) {
                this.logger.warn(`Invalid marker id at position ${i}`);
                return null;
            }
            
            const marker = this.graph.getMarker(id);
            
            if (!marker) {
                this.logger.warn(`Marker ${id} not found during path reconstruction`);
                return null;
            }
            
            const node: PathNode = {
                markerId: marker.id,
                position: marker.position,
                name: marker.name,
                type: marker.type,
                distance: 0,
                distanceFromStart: accumulatedDistance
            };
            
            if (i > 0) {
                const prevNode = path[i - 1];
                if (prevNode) {
                    const segmentDistance = Vector3.Distance(prevNode.position, node.position);
                    node.distance = segmentDistance;
                    accumulatedDistance += segmentDistance;
                    node.distanceFromStart = accumulatedDistance;
                }
            } else {
                node.distance = 0;
                node.distanceFromStart = 0;
            }
            
            path.push(node);
        }

        const result: PathResult = {
            path,
            totalDistance: graphPath.totalDistance,
            found: true
        };

        this.logger.info(`Path found: ${path.map(p => p.name || p.markerId).join(' → ')} (${result.totalDistance.toFixed(2)}m)`);
        this.eventBus.emit(EventType.ROUTE_CALCULATION_COMPLETE, { 
            fromId: startId, 
            toId: endId, 
            distance: result.totalDistance,
            nodesCount: path.length 
        });

        return result;
    }

    /**
     * Найти путь и вернуть в формате RouteResult
     */
    public findRoute(startId: string, endId: string): RouteResult | null {
        const result = this.findShortestPath(startId, endId);
        if (!result) return null;

        const routePoints: RoutePoint[] = result.path.map(node => ({
            markerId: node.markerId,
            position: node.position,
            name: node.name || '',
            type: node.type || 'marker'
        }));

        const segments: RouteSegment[] = [];
        for (let i = 0; i < routePoints.length - 1; i++) {
            const from = routePoints[i];
            const to = routePoints[i + 1];
            
            if (from && to) {
                segments.push({
                    from: from.markerId,
                    to: to.markerId,
                    distance: Vector3.Distance(from.position, to.position)
                });
            }
        }

        return {
            path: routePoints,
            totalDistance: result.totalDistance,
            fromMarkerId: startId,
            toMarkerId: endId,
            segments
        };
    }

    /**
     * Получить позиции всех точек маршрута
     */
    public getRoutePositions(markers: Marker[]): Vector3[] {
        return markers.map(m => m.position);
    }

    /**
     * Вычислить расстояние между двумя маркерами
     */
    public getDistance(marker1: Marker, marker2: Marker): number {
        return Vector3.Distance(marker1.position, marker2.position);
    }

    /**
     * Проверить, существует ли путь
     */
    public hasPath(startId: string, endId: string): boolean {
        return this.graph.isReachable(startId, endId);
    }
}