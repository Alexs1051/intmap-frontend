import { Vector3, Color3 } from "@babylonjs/core";
import { CameraMode } from "../../features/camera/types";

export enum MarkerType {
  MARKER = 'marker',
  FLAG = 'flag',
  WAYPOINT = 'waypoint'
}

export interface MarkerData {
  id: string;
  type: MarkerType;
  position: Vector3;
  title?: string;
  description?: string;
  backgroundColor: Color3;
  foregroundColor: Color3;
  icon?: string; // Юникод или класс Font Awesome
  size?: number;
  floor?: number; // Номер этажа (для навигации)
}

export interface MarkerConfig {
  defaultSize: number;
  hoverScale: number;
  selectedOutlineColor: Color3;
  outlineWidth: number;
  focusDistance: number;
  focusFromAngle?: boolean; // Фокусироваться под углом или прямо сверху
}

export interface FocusOptions {
  distance?: number;       // Расстояние до маркера
  angle?: {                // Угол обзора
    alpha?: number;        // Горизонтальный угол
    beta?: number;         // Вертикальный угол
  };
  duration?: number;       // Длительность анимации
  keepMode?: boolean;      // Сохранить текущий режим камеры
  switchToMode?: CameraMode; // Переключить режим (если нужно)
}