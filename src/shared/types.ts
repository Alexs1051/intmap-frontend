export enum CameraMode {
  MODE_2D = '2d',
  MODE_3D = '3d'
}

export enum UIEventType {
  SEARCH_TOGGLE,
  CAMERA_MODE_TOGGLE,
  RESET_CAMERA,
  VIEW_MODE_TOGGLE,
  WALLS_TRANSPARENCY_TOGGLE,
  NEXT_FLOOR,
  PREVIOUS_FLOOR,
  AUTH_TOGGLE,
  TOGGLE_GRAPH
}

export interface UIEvent {
  type: UIEventType;
  payload?: any;
}