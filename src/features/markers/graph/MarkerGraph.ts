import { Vector3 } from "@babylonjs/core";
import { Marker } from "../Marker";
import { ConnectionDirection } from "@shared/types";
import { GraphEdge, GraphNode, GraphPathResult } from "@shared/types/dto";
import { EventBus } from "../../../core/events/EventBus";
import { EventType } from "../../../core/events/EventTypes";

/**
 * Граф маркеров для навигации
 * Хранит узлы (маркеры) и рёбра (связи), реализует BFS поиск пути
 */
export class MarkerGraph {
    private eventBus: EventBus;
    private _nodes: Map<string, GraphNode> = new Map();
    private _edges: Map<string, GraphEdge> = new Map();
    private _markers: Map<string, Marker> = new Map();

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    public addNode(marker: Marker): void {
        if (this._nodes.has(marker.id)) return;

        this._markers.set(marker.id, marker);
        this._nodes.set(marker.id, { markerId: marker.id, connections: new Map() });
        this.eventBus.emit(EventType.GRAPH_NODE_ADDED, { markerId: marker.id });
    }

    public addConnection(fromId: string, toId: string, direction: ConnectionDirection, weight?: number): boolean {
        const fromNode = this._nodes.get(fromId);
        const toNode = this._nodes.get(toId);
        const fromMarker = this._markers.get(fromId);
        const toMarker = this._markers.get(toId);

        if (!fromNode || !toNode || !fromMarker || !toMarker) return false;

        const distance = Vector3.Distance(fromMarker.position, toMarker.position);

        const edgeId = `${fromId}->${toId}`;
        const edge: GraphEdge = { from: fromId, to: toId, direction, weight: weight || distance, distance };
        this._edges.set(edgeId, edge);
        fromNode.connections.set(toId, edge);

        if (direction === 'two-way') {
            const reverseEdgeId = `${toId}->${fromId}`;
            const reverseEdge: GraphEdge = { from: toId, to: fromId, direction, weight: weight || distance, distance };
            this._edges.set(reverseEdgeId, reverseEdge);
            toNode.connections.set(fromId, reverseEdge);
        }

        this.eventBus.emit(EventType.GRAPH_EDGE_ADDED, { fromId, toId, direction });
        return true;
    }

    /**
     * BFS поиск кратчайшего пути
     */
    public findPath(startId: string, endId: string): GraphPathResult | null {
        if (!this._nodes.has(startId) || !this._nodes.has(endId)) return null;

        const queue: string[] = [startId];
        const visited = new Set<string>([startId]);
        const previous = new Map<string, string>();

        while (queue.length > 0) {
            const current = queue.shift()!;

            if (current === endId) {
                return this.reconstructPath(previous, endId);
            }

            const currentNode = this._nodes.get(current);
            if (currentNode) {
                for (const neighborId of currentNode.connections.keys()) {
                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);
                        previous.set(neighborId, current);
                        queue.push(neighborId);
                    }
                }
            }
        }

        return null;
    }

    /**
     * Восстановить путь из карты previous
     */
    private reconstructPath(previous: Map<string, string>, endId: string): GraphPathResult {
        const path: string[] = [];
        let node: string | undefined = endId;
        while (node) {
            path.unshift(node);
            node = previous.get(node);
        }

        let totalDistance = 0;
        for (let i = 0; i < path.length - 1; i++) {
            const fromId = path[i];
            const toId = path[i + 1];
            if (fromId && toId) {
                const fromNode = this._nodes.get(fromId);
                const edge = fromNode?.connections.get(toId);
                if (edge) totalDistance += edge.distance;
            }
        }

        return { path, totalDistance };
    }

    /**
     * Получить соседей маркера
     */
    public getNeighbors(markerId: string): Marker[] {
        const node = this._nodes.get(markerId);
        if (!node) return [];

        const neighbors: Marker[] = [];
        node.connections.forEach((_, neighborId) => {
            const neighbor = this._markers.get(neighborId);
            if (neighbor) neighbors.push(neighbor);
        });
        return neighbors;
    }

    public getMarker(id: string): Marker | undefined {
        return this._markers.get(id);
    }

    public getAllMarkers(): Marker[] {
        return Array.from(this._markers.values());
    }

    public removeNode(markerId: string): boolean {
        if (!this._nodes.has(markerId)) return false;

        this._nodes.forEach((node, id) => {
            if (node.connections.has(markerId)) {
                node.connections.delete(markerId);
                this._edges.delete(`${id}->${markerId}`);
                this._edges.delete(`${markerId}->${id}`);
            }
        });

        this._nodes.delete(markerId);
        this._markers.delete(markerId);
        this.eventBus.emit(EventType.GRAPH_NODE_REMOVED, { markerId });
        return true;
    }

    public hasConnection(fromId: string, toId: string): boolean {
        return this._nodes.get(fromId)?.connections.has(toId) || false;
    }

    public isReachable(startId: string, endId: string): boolean {
        return this.findPath(startId, endId) !== null;
    }

    public getAllEdges(): GraphEdge[] {
        return Array.from(this._edges.values());
    }

    public clear(): void {
        this._nodes.clear();
        this._edges.clear();
        this._markers.clear();
        this.eventBus.emit(EventType.GRAPH_CLEARED);
    }

    public get nodeCount(): number {
        return this._nodes.size;
    }

    public get edgeCount(): number {
        return this._edges.size;
    }
}