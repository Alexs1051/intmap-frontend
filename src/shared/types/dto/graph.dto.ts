import { ConnectionDirection } from "@shared/types/enum/marker.enum";

export interface GraphNode {
    markerId: string;
    connections: Map<string, GraphEdge>;
}

export interface GraphEdge {
    from: string;
    to: string;
    direction: ConnectionDirection;
    weight: number;
    distance: number;
}

export interface GraphPathResult {
    path: string[];
    totalDistance: number;
    blockedNodeId?: string;
}
