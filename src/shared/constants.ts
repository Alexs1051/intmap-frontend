import { Color3 } from "@babylonjs/core";

// Grid constants
export const GRID_SIZE = 200;
export const GRID_COLOR_MAIN = Color3.FromHexString("#e6e6e6");
export const GRID_COLOR_SECONDARY = Color3.FromHexString("#b8b8b8");

// Background constants
export const SKY_COLOR_TOP = Color3.FromHexString("#4a90e2");
export const SKY_COLOR_MIDDLE = Color3.FromHexString("#7bb0e6");
export const SKY_COLOR_BOTTOM = Color3.FromHexString("#b3d9ff"); 
export const SKY_GRADIENT_ENABLED = true;
export const SKY_HORIZON_HEIGHT = 0.3;
export const GROUND_COLOR = new Color3(0.2, 0.2, 0.2);
export const FOG_ENABLED = false;
export const FOG_DENSITY = 0.02;
export const FOG_COLOR = new Color3(0.8, 0.8, 0.8);

// Marker constants
export const MARKER_CONFIG = {
  defaultSize: 1.5,
  waypointSize: 0.8,    // Вейпоинты меньше
  flagSize: 1.8,        // Флаги больше
  markerSize: 1.5,      // Обычные маркеры
  hoverScale: 1.2,
  focusDistance: 8
}

export const CAMERA_CONFIG = {
  minBeta: 0.1,
  maxBeta: Math.PI / 2,
  minRadius: 5,
  maxRadius: 50,
  panningSpeed: 50,
  wheelPrecision: 10,
  pinchPrecision: 10,
} as const;

export const CAMERA_POSITIONS = {
  intro: { alpha: Math.PI / 4, beta: Math.PI / 4, radius: 60 },
  building: { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 30 },
  floor: { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 15 }
} as const;