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

export interface BuildingDimensions {
  height: number;
  width: number;
  depth: number;
}