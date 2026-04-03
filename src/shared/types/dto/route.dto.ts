import { Vector3 } from "@babylonjs/core";

export interface RoutePoint {
    markerId: string;
    position: Vector3;
    name: string;
    type: string;
}

export interface RouteSegment {
    from: string;
    to: string;
    distance: number;
}

export interface RouteResult {
    path: RoutePoint[];
    totalDistance: number;
    fromMarkerId: string;
    toMarkerId: string;
    segments: RouteSegment[];
}