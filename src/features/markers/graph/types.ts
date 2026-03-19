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
  iconPath: string; // Обязательный путь к PNG
  description?: string;
  backgroundColor: {
    r: number;
    g: number;
    b: number;
  };
  foregroundColor: {
    r: number;
    g: number;
    b: number;
  };
  connections?: MarkerConnection[];
}

// Флаг
export interface FlagData extends BaseMarkerData {
  type: MarkerType.FLAG;
  name: string;
  iconPath: string; // Обязательный путь к PNG
  backgroundColor: {
    r: number;
    g: number;
    b: number;
  };
  foregroundColor: {
    r: number;
    g: number;
    b: number;
  };
  qr?: string;
  connections?: MarkerConnection[];
}

// Вейпоинт
export interface WaypointData extends BaseMarkerData {
  type: MarkerType.WAYPOINT;
  name: string;
  iconPath: string; // Обязательный путь к PNG
  backgroundColor: {
    r: number;
    g: number;
    b: number;
  };
  foregroundColor: {
    r: number;
    g: number;
    b: number;
  };
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