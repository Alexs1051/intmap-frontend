import { Vector3 } from "@babylonjs/core";
import { MarkerType } from "@shared/types/enum/marker.enum";

export interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface MarkerData {
    id: string;
    name: string;
    type: MarkerType;
    position: Vector3;
    floor?: number;
    description?: string;
    iconName?: string;
    backgroundColor?: RGBA;
    textColor?: RGBA;
    connections?: MarkerConnection[];
}

export type AnyMarkerData = MarkerData;

export interface WaypointData extends MarkerData {
    type: MarkerType.WAYPOINT;
}

export interface FlagData extends MarkerData {
    type: MarkerType.FLAG;
    qr?: string;
}

export interface MarkerConnection {
    fromId: string;
    toId: string;
    direction?: 'one-way' | 'two-way';
    weight?: number;
}

export interface MarkerIconMap {
    [key: string]: string;
}

export interface MarkerColors {
    [key: string]: RGBA;
}

export interface FocusOptions {
    distance?: number;
    duration?: number;
}

export interface PathNode {
    markerId: string;
    position: Vector3;
    name: string;
    type: string;
    distance: number;
    distanceFromStart: number;
}

export interface PathResult {
    path: PathNode[];
    totalDistance: number;
    found: boolean;
}

export interface SearchResult {
    id: string;
    name: string;
    type: MarkerType;
    iconName?: string;
    floor?: number;
    marker?: MarkerData;
    backgroundColor?: RGBA;
    textColor?: RGBA;
}