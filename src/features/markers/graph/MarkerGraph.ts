import { Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../../core/di/Container";
import { Logger } from "../../../core/logger/Logger";
import { EventBus } from "../../../core/events/EventBus";
import { EventType } from "../../../core/events/EventTypes";
import { Marker } from "../Marker";
import { ConnectionDirection, MarkerConnection } from "@shared/types";
import { GraphEdge, GraphNode, GraphPathResult } from "@shared/types/dto";

/**
 * Граф маркеров для навигации
 */
@injectable()
export class MarkerGraph {
    private logger: Logger;
    private eventBus: EventBus;
    
    private _nodes: Map<string, GraphNode> = new Map();
    private _edges: Map<string, GraphEdge> = new Map();
    private _markers: Map<string, Marker> = new Map();

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus
    ) {
        this.logger = logger.getLogger('MarkerGraph');
        this.eventBus = eventBus;
    }

    public addNode(marker: Marker): void {
        if (this._nodes.has(marker.id)) {
            this.logger.warn(`Marker ${marker.id} already exists in graph`);
            return;
        }

        this._markers.set(marker.id, marker);
        this._nodes.set(marker.id, {
            markerId: marker.id,
            connections: new Map()
        });

        this.logger.debug(`Node added: ${marker.id} (${marker.name})`);
        this.eventBus.emit(EventType.GRAPH_NODE_ADDED, { markerId: marker.id });
    }

    public addConnection(
        fromId: string,
        toId: string,
        direction: ConnectionDirection,
        weight?: number
    ): boolean {
        const fromNode = this._nodes.get(fromId);
        const toNode = this._nodes.get(toId);
        const fromMarker = this._markers.get(fromId);
        const toMarker = this._markers.get(toId);

        if (!fromNode || !toNode || !fromMarker || !toMarker) {
            this.logger.warn(`Cannot add connection: nodes not found (${fromId} -> ${toId})`);
            return false;
        }

        const fromPos = fromMarker.position;
        const toPos = toMarker.position;
        const distance = Vector3.Distance(fromPos, toPos);

        const edgeId = `${fromId}->${toId}`;
        const edge: GraphEdge = {
            from: fromId,
            to: toId,
            direction,
            weight: weight || distance,
            distance
        };

        this._edges.set(edgeId, edge);
        fromNode.connections.set(toId, edge);

        if (direction === 'two-way') {
            const reverseEdgeId = `${toId}->${fromId}`;
            const reverseEdge: GraphEdge = {
                from: toId,
                to: fromId,
                direction,
                weight: weight || distance,
                distance
            };
            this._edges.set(reverseEdgeId, reverseEdge);
            toNode.connections.set(fromId, reverseEdge);
        }

        this.logger.debug(`Connection added: ${fromId} -> ${toId} (${direction})`);
        this.eventBus.emit(EventType.GRAPH_EDGE_ADDED, { fromId, toId, direction });
        return true;
    }

    public addConnectionsFromMarker(marker: Marker): void {
        const connections = marker.data.connections;
        if (!connections || !Array.isArray(connections)) return;

        connections.forEach((conn: MarkerConnection) => {
            if (conn.fromId && conn.toId && conn.direction) {
                this.addConnection(conn.fromId, conn.toId, conn.direction, conn.weight);
            }
        });
    }

    public findPath(startId: string, endId: string): GraphPathResult | null {
        this.logger.debug(`Finding path from ${startId} to ${endId}`);
        
        if (!this._nodes.has(startId) || !this._nodes.has(endId)) {
            return null;
        }
        
        const queue: string[] = [startId];
        const visited = new Set<string>([startId]);
        const previous = new Map<string, string>();
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            
            if (current === endId) {
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
                    
                    // ✅ Проверяем, что fromId и toId существуют
                    if (fromId && toId) {
                        const fromNode = this._nodes.get(fromId);
                        const edge = fromNode?.connections.get(toId);
                        if (edge) {
                            totalDistance += edge.distance;
                        }
                    }
                }
                
                return { path, totalDistance };
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
        
        this.logger.warn(`Path not found: ${startId} -> ${endId}`);
        return null;
    }

    public getNeighbors(markerId: string): Marker[] {
        const node = this._nodes.get(markerId);
        if (!node) {
            this.logger.warn(`Node ${markerId} not found in graph`);
            return [];
        }

        const neighbors: Marker[] = [];
        node.connections.forEach((_, neighborId) => {
            const neighborMarker = this._markers.get(neighborId);
            if (neighborMarker) {
                neighbors.push(neighborMarker);
            }
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
        
        this.logger.debug(`Node removed: ${markerId}`);
        this.eventBus.emit(EventType.GRAPH_NODE_REMOVED, { markerId });
        return true;
    }

    public hasConnection(fromId: string, toId: string): boolean {
        const fromNode = this._nodes.get(fromId);
        return fromNode?.connections.has(toId) || false;
    }

    public isReachable(startId: string, endId: string): boolean {
        const result = this.findPath(startId, endId);
        return result !== null;
    }

    public getAllEdges(): GraphEdge[] {
        return Array.from(this._edges.values());
    }

    public clear(): void {
        this._nodes.clear();
        this._edges.clear();
        this._markers.clear();
        this.logger.debug("Graph cleared");
        this.eventBus.emit(EventType.GRAPH_CLEARED);
    }

    private getNeighborIds(nodeId: string): string[] {
        const node = this._nodes.get(nodeId);
        if (!node) return [];
        return Array.from(node.connections.keys());
    }

    public getReachableNodes(startId: string): string[] {
        if (!this._nodes.has(startId)) return [];

        const visited = new Set<string>();
        const queue: string[] = [startId];
        visited.add(startId);

        while (queue.length > 0) {
            const current = queue.shift()!;
            const neighbors = this.getNeighborIds(current);
            
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        return Array.from(visited);
    }

    public get nodeCount(): number {
        return this._nodes.size;
    }

    public get edgeCount(): number {
        return this._edges.size;
    }

    public get markers(): Map<string, Marker> {
        return this._markers;
    }
}