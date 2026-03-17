import { Color3 } from "@babylonjs/core";

// Grid constants
export const GRID_SIZE = 200;
export const GRID_DIVISIONS = 200;
export const GRID_COLOR_MAIN = Color3.FromHexString("#e6e6e6");
export const GRID_COLOR_SECONDARY = Color3.FromHexString("#b8b8b8");

// Background constants
export const SKY_COLOR_TOP = Color3.FromHexString("#4a90e2");
export const SKY_COLOR_MIDDLE = Color3.FromHexString("#7bb0e6");
export const SKY_COLOR_BOTTOM = Color3.FromHexString("#b3d9ff"); 
export const SKY_GRADIENT_ENABLED = true;
export const SKY_HORIZON_HEIGHT = 0.8;

export const GROUND_COLOR = new Color3(0.2, 0.2, 0.2);

// Marker constants
export const MARKER_CONFIG = {
  defaultSize: 1.5,
  hoverScale: 1.2,
  selectedOutlineColor: new Color3(0.3, 0.6, 1.0),
  outlineWidth: 2,
  focusDistance: 8
} as const;