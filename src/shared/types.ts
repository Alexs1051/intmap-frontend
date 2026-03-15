import { CameraMode } from "../features/camera/types";
export { CameraMode };

export interface UIEvent {
  type: UIEventType;
  payload?: any;
}

export enum UIEventType {
  CAMERA_MODE_TOGGLE,
  RESET_CAMERA,
  VIEW_MODE_TOGGLE,
  WALLS_TRANSPARENCY_TOGGLE,
  NEXT_FLOOR,
  PREVIOUS_FLOOR
}