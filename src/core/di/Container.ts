import { Container } from "inversify";
import "reflect-metadata";

export const TYPES = {
  // Core
  BabylonEngine: Symbol.for("BabylonEngine"),
  SceneManager: Symbol.for("SceneManager"),
  Logger: Symbol.for("Logger"),
  EventBus: Symbol.for("EventBus"),

  // Features
  UIManager: Symbol.for("UIManager"),
  GridManager: Symbol.for("GridManager"),
  BackgroundManager: Symbol.for("BackgroundManager"),
  LightingManager: Symbol.for("LightingManager"),
  CameraManager: Symbol.for("CameraManager"),
  BuildingManager: Symbol.for("BuildingManager"),
  MarkerManager: Symbol.for("MarkerManager"),

  // Building components
  BuildingLoader: Symbol.for("BuildingLoader"),
  BuildingParser: Symbol.for("BuildingParser"),
  BuildingAnimator: Symbol.for("BuildingAnimator"),
  FloorManager: Symbol.for("FloorManager"),
  WallManager: Symbol.for("WallManager"),

  // UI Components
  ConnectionScreen: Symbol.for("ConnectionScreen"),
  FPSCounter: Symbol.for("FPSCounter"),
  SearchBar: Symbol.for("SearchBar"),
  PopupManager: Symbol.for("PopupManager"),
  MarkerDetailsPanel: Symbol.for("MarkerDetailsPanel"),
  BuildingTitle: Symbol.for("BuildingTitle"),
  AuthPopup: Symbol.for("AuthPopup"),
  ControlPanel: Symbol.for("ControlPanel"),

  // Utils
  ConfigService: Symbol.for("ConfigService"),
  AssetLoader: Symbol.for("AssetLoader"),
  ResourceCache: Symbol.for("ResourceCache"),
  PerformanceTracker: Symbol.for("PerformanceTracker"),

  // UI Factory
  UIFactory: Symbol.for("UIFactory"),

  // Graph
  MarkerGraph: Symbol.for("MarkerGraph"),
  MarkerGraphRenderer: Symbol.for("MarkerGraphRenderer"),
  Pathfinder: Symbol.for("Pathfinder"),

  // Route
  RouteManager: Symbol.for("RouteManager"),

  // Camera components
  CameraAnimator: Symbol.for("CameraAnimator"),
  CameraModeManager: Symbol.for("CameraModeManager"),
  CameraInputHandler: Symbol.for("CameraInputHandler"),

  // Widgets
  Marker: Symbol.for("Marker"),
} as const;

const container = new Container({ defaultScope: "Singleton" });

export { container };