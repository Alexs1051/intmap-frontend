/**
 * Типы событий приложения
 */
export enum EventType {
  // Загрузка
  LOADING_START = "loading:start",
  LOADING_PROGRESS = "loading:progress",
  LOADING_COMPLETE = "loading:complete",
  LOADING_ERROR = "loading:error",

  // Сцена
  SCENE_READY = "scene:ready",
  SCENE_BEFORE_RENDER = "scene:beforeRender",
  SCENE_AFTER_RENDER = "scene:afterRender",
  SCENE_LOADED = 'scene:loaded',

  // Здание
  BUILDING_LOADED = 'building:loaded',
  BUILDING_CONSTRUCTION_START = 'building:construction:start',
  BUILDING_CONSTRUCTION_COMPLETE = 'building:construction:complete',

  // Этажи
  FLOOR_CHANGED = "floor:changed",
  FLOOR_HIDDEN = 'floor:hidden',
  FLOOR_SWITCH_REQUEST = 'floor:switch:request',
  VIEW_MODE_CHANGED = 'view:mode:changed',
  FLOOR_EXPAND_CHANGED = 'floor:expand:changed',

  // Стены
  WALL_TRANSPARENCY_TOGGLED = 'wall:transparency:toggled',
  WALL_MODE_CHANGED = "wall:mode:changed",
  WALL_TRANSPARENCY_REQUEST = 'wall:transparency:request',

  // Камера
  CAMERA_MOVEMENT_START = "camera:movement:start",
  CAMERA_MOVEMENT_END = "camera:movement:end",
  CAMERA_MODE_CHANGED = "camera:mode:changed",
  CAMERA_FOCUSED = 'camera:focused',
  CAMERA_RESET = 'camera:reset',

  // Маркеры
  MARKER_ADDED = "marker:added",
  MARKER_REMOVED = "marker:removed",
  MARKER_SELECTED = "marker:selected",
  MARKER_DESELECTED = "marker:deselected",
  MARKER_DOUBLE_CLICKED = "marker:doubleClicked",
  MARKERS_LOADED = "markers:loaded",

  // Граф
  GRAPH_NODE_ADDED = "graph:node:added",
  GRAPH_NODE_REMOVED = "graph:node:removed",
  GRAPH_EDGE_ADDED = "graph:edge:added",
  GRAPH_RENDERED = "graph:rendered",
  GRAPH_SHOWN = "graph:shown",
  GRAPH_HIDDEN = "graph:hidden",
  GRAPH_CLEARED = "graph:cleared",
  GRAPH_VISIBILITY_CHANGED = "graph:visibility:changed",

  // Маршруты
  ROUTE_FOUND = "route:found",
  ROUTE_CALCULATION_START = "route:calculation:start",
  ROUTE_CALCULATION_COMPLETE = "route:calculation:complete",
  ROUTE_CALCULATION_ERROR = "route:calculation:error",
  PATH_HIGHLIGHTED = "path:highlighted",

  // UI
  UI_LOADING_START = "ui:loading:start",
  UI_LOADING_PROGRESS = "ui:loading:progress",
  UI_LOADING_COMPLETE = "ui:loading:complete",
  UI_NOTIFICATION = "ui:notification",
  UI_THEME_CHANGED = "ui:theme:changed",
  UI_SEARCH_OPEN = "ui:search:open",
  UI_SEARCH_CLOSE = "ui:search:close",
  UI_AUTH_OPEN = "ui:auth:open",
  UI_AUTH_CLOSE = "ui:auth:close",
  UI_AUTH_SUCCESS = "ui:auth:success",
  UI_AUTH_LOGOUT = "ui:auth:logout",

  // Системные
  ERROR_OCCURRED = "error:occurred",
  CONNECTION_STATUS_CHANGED = "connection:status:changed",
  ROUTE_CLEARED = "ROUTE_CLEARED"
}

/**
 * Интерфейс для событий с данными
 */
export interface IEvent<T = any> {
  type: EventType;
  data: T;
  timestamp: number;
  source?: string;
}