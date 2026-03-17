import { Vector3 } from "@babylonjs/core";

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