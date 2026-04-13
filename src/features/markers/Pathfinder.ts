import { Vector3 } from "@babylonjs/core";
import { Logger } from "../../core/logger/Logger";
import { EventBus } from "../../core/events/EventBus";
import { EventType } from "../../core/events/EventTypes";
import { MarkerGraph } from "./graph/MarkerGraph";
import { PathNode, PathResult } from "@shared/types";
import { RoutePoint, RouteResult, RouteSegment } from "@shared/types/dto";

/**
 * Поиск пути на графе маркеров
 * Делегирует алгоритм поиска в MarkerGraph, преобразует результат
 */
export class Pathfinder {
    private eventBus: EventBus;
    private graph: MarkerGraph;

    constructor(
        _logger: Logger,
        eventBus: EventBus,
        graph: MarkerGraph
    ) {
        this.eventBus = eventBus;
        this.graph = graph;
    }

    /**
     * Найти кратчайший путь между маркерами
     */
    public findShortestPath(startId: string, endId: string): PathResult | null {
        this.eventBus.emit(EventType.ROUTE_CALCULATION_START, { startId, endId });

        if (!this.graph.getMarker(startId) || !this.graph.getMarker(endId)) {
            this.eventBus.emit(EventType.ROUTE_CALCULATION_ERROR, { error: 'Marker not found' });
            return null;
        }

        const graphPath = this.graph.findPath(startId, endId);
        if (!graphPath) {
            this.eventBus.emit(EventType.ROUTE_CALCULATION_ERROR, { error: 'No path found' });
            return null;
        }

        const path = this.buildPathNodes(graphPath.path);
        const result: PathResult = { path, totalDistance: graphPath.totalDistance, found: true };

        this.eventBus.emit(EventType.ROUTE_CALCULATION_COMPLETE, {
            fromId: startId, toId: endId,
            distance: result.totalDistance, nodesCount: path.length
        });

        return result;
    }

    /**
     * Построить массив PathNode из ID маркеров
     */
    private buildPathNodes(ids: string[]): PathNode[] {
        const nodes: PathNode[] = [];
        let accumulatedDistance = 0;

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const marker = this.graph.getMarker(id!);
            if (!marker) continue;

            const node: PathNode = {
                markerId: marker.id,
                position: marker.position,
                name: marker.name,
                type: marker.type,
                distance: 0,
                distanceFromStart: accumulatedDistance
            };

            if (i > 0) {
                const prev = nodes[i - 1];
                if (prev) {
                    node.distance = Vector3.Distance(prev.position, node.position);
                    accumulatedDistance += node.distance;
                    node.distanceFromStart = accumulatedDistance;
                }
            }

            nodes.push(node);
        }

        return nodes;
    }

    /**
     * Найти путь в формате RouteResult
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
     * Проверить, существует ли путь
     */
    public hasPath(startId: string, endId: string): boolean {
        return this.graph.isReachable(startId, endId);
    }
}