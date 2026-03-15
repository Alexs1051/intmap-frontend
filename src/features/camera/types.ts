import { Vector3 } from "@babylonjs/core";

export enum CameraMode {
  MODE_2D = '2d',
  MODE_3D = '3d'
}

export interface CameraTransform {
  alpha: number;
  beta: number;
  radius: number;
  target: Vector3;
}

export interface BuildingBounds {
  minY: number;
  maxY: number;
  center: Vector3;  // Центр здания (уже есть, просто убеждаемся)
}

export interface AnimationConfig {
  duration: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
}

export const EasingFunctions = {
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3)
};