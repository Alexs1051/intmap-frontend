import { Vector3 } from "@babylonjs/core";

export enum MarkerType {
  MARKER = 'marker',
  FLAG = 'flag',
  WAYPOINT = 'waypoint'
}

export enum ConnectionDirection {
  ONE_WAY = 'one-way',
  TWO_WAY = 'two-way'
}

export interface MarkerConnection {
  fromId: string;
  toId: string;
  direction: ConnectionDirection;
  weight?: number;
}

// Цвет в формате RGBA (0-1)
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number; // прозрачность 0-1
}

// Базовый интерфейс для всех маркеров
export interface BaseMarkerData {
  id: string;
  type: MarkerType;
  position: Vector3;
  floor: number;
}

// Обычная метка
export interface MarkerData extends BaseMarkerData {
  type: MarkerType.MARKER;
  name: string;
  iconName: string;
  description?: string;
  backgroundColor: RGBA; // RGBA
  textColor: RGBA;       // цвет текста (раньше был foregroundColor)
  connections?: MarkerConnection[];
}

// Флаг
export interface FlagData extends BaseMarkerData {
  type: MarkerType.FLAG;
  name: string;
  iconName: string;
  backgroundColor: RGBA;
  textColor: RGBA;
  qr?: string;
  connections?: MarkerConnection[];
}

// Вейпоинт
export interface WaypointData extends BaseMarkerData {
  type: MarkerType.WAYPOINT;
  name: string;
  iconName: string;
  backgroundColor: RGBA;
  textColor: RGBA;
  connections?: MarkerConnection[];
}

export type AnyMarkerData = MarkerData | FlagData | WaypointData;

export interface MarkerConfig {
  defaultSize: number;
  hoverScale: number;
  focusDistance: number;
  waypointSize: number;
  flagSize: number;
  markerSize: number;
}

export interface FocusOptions {
  distance?: number;
  angle?: {
    alpha?: number;
    beta?: number;
  };
  duration?: number;
  keepMode?: boolean;
}

export interface RoutePoint {
  markerId: string;
  position: Vector3;
  name: string;
  type: MarkerType;
}

export interface RouteResult {
  path: RoutePoint[];
  totalDistance: number;
  fromMarkerId: string;
  toMarkerId: string;
  segments: {
    from: string;
    to: string;
    distance: number;
  }[];
}