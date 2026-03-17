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
  icon?: string;
  size?: number;
  floor?: number;
}

export interface FocusOptions {
  distance?: number;
  angle?: {
    alpha?: number;
    beta?: number;
  };
  duration?: number;
  keepMode?: boolean;
  switchToMode?: CameraMode;
}