// ContainerConfig.ts
import { container, TYPES } from "./container";
import { BabylonEngine } from "@core/engine/babylon-engine";
import { Logger, logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { ConfigService } from "@core/config/config-service";
import { AssetLoader } from "@core/assets/asset-loader";
import { ResourceCache } from "@core/assets/resource-cache";
import { PerformanceTracker } from "@core/utils/performance-tracker";
import { SceneManager } from "@core/scene/scene-manager";

// Импортируем менеджеры
import { CameraManager } from "@features/camera/camera-manager";
import { CameraAnimator } from "@features/camera/camera-animator";
import { CameraModeManager } from "@features/camera/camera-mode-manager";
import { CameraInputHandler } from "@features/camera/camera-input-handler";
import { BackgroundManager } from "@features/background/background-manager";
import { GridManager } from "@features/grid/grid-manager";
import { LightingManager } from "@features/lighting/lighting-manager";

// Импортируем Building компоненты
import { BuildingLoader } from "@features/building/building-loader";
import { BuildingParser } from "@features/building/building-parser";
import { BuildingAnimator } from "@features/building/building-animator";
import { FloorManager } from "@features/building/floor-manager";
import { WallManager } from "@features/building/wall-manager";
import { BuildingManager } from "@features/building/building-manager";
import { FloorExpander } from "@features/building/floor-expander";

// Импортируем Marker компоненты
import { MarkerManager } from "@features/markers/marker-manager";
import { MarkerGraph } from "@features/markers/graph/marker-graph";
import { MarkerGraphRenderer } from "@features/markers/graph/marker-graph-renderer";
import { Pathfinder } from "@features/markers/pathfinder";

// Импортируем UI компоненты
import { UIFactory } from "@core/ui/ui-factory";
import { UIManager } from "@core/ui/ui-manager";
import { ControlPanel } from "@features/ui/control-panel/control-panel";
import { SearchBar } from "@features/ui/search/search-bar";
import { PopupManager } from "@features/ui/popup/popup-manager";
import { MarkerDetailsPanel } from "@features/ui/details/marker-details-panel";
import { ConnectionScreen } from "@features/ui/connection/connection-screen";
import { FPSCounter } from "@features/ui/hud/fps-counter";
import { BuildingTitle } from "@features/ui/hud/building-title";
import { AuthPopup } from "@features/ui/popup/auth-popup";
import { RouteManager } from "@core/route/route-manager";



/**
 * Конфигурация DI контейнера
 */
export function configureContainer(): void {
  // Core Services
  container.bind<BabylonEngine>(TYPES.BabylonEngine).to(BabylonEngine).inSingletonScope();
  container.bind<Logger>(TYPES.Logger).toConstantValue(logger);
  container.bind<EventBus>(TYPES.EventBus).to(EventBus).inSingletonScope();
  container.bind<ConfigService>(TYPES.ConfigService).to(ConfigService).inSingletonScope();
  container.bind<AssetLoader>(TYPES.AssetLoader).to(AssetLoader).inSingletonScope();
  container.bind<ResourceCache>(TYPES.ResourceCache).to(ResourceCache).inSingletonScope();
  container.bind<PerformanceTracker>(TYPES.PerformanceTracker).to(PerformanceTracker).inSingletonScope();
  container.bind<SceneManager>(TYPES.SceneManager).to(SceneManager).inSingletonScope();

  // Camera components
  container.bind(TYPES.CameraAnimator).toDynamicValue(() => {
    return new CameraAnimator();
  }).inSingletonScope();

  container.bind(TYPES.CameraModeManager).toDynamicValue(() => {
    return new CameraModeManager();
  }).inSingletonScope();

  container.bind(TYPES.CameraInputHandler).toDynamicValue(() => {
    return new CameraInputHandler();
  }).inSingletonScope();

  container.bind(TYPES.CameraManager).toDynamicValue(() => {
    const logger = container.get<Logger>(TYPES.Logger);
    const eventBus = container.get<EventBus>(TYPES.EventBus);
    const animator = container.get<CameraAnimator>(TYPES.CameraAnimator);
    const modeManager = container.get<CameraModeManager>(TYPES.CameraModeManager);
    const inputHandler = container.get<CameraInputHandler>(TYPES.CameraInputHandler);
    return new CameraManager(logger, eventBus, animator, modeManager, inputHandler);
  }).inSingletonScope();

  // Feature Managers
  container.bind(TYPES.BackgroundManager).to(BackgroundManager).inSingletonScope();
  container.bind(TYPES.GridManager).to(GridManager).inSingletonScope();
  container.bind(TYPES.LightingManager).to(LightingManager).inSingletonScope();
  container.bind(TYPES.BuildingManager).to(BuildingManager).inSingletonScope();
  container.bind(TYPES.FloorManager).to(FloorManager).inSingletonScope();
  container.bind(TYPES.WallManager).to(WallManager).inSingletonScope();
  container.bind(TYPES.FloorExpander).to(FloorExpander).inSingletonScope();

  // Building Components
  container.bind(TYPES.BuildingLoader).to(BuildingLoader).inSingletonScope();
  container.bind(TYPES.BuildingParser).to(BuildingParser).inSingletonScope();
  container.bind(TYPES.BuildingAnimator).to(BuildingAnimator).inSingletonScope();

  // Marker components (обычные классы, не @injectable)
  container.bind(TYPES.MarkerGraph).toDynamicValue(() => {
    const eventBus = container.get<EventBus>(TYPES.EventBus);
    return new MarkerGraph(eventBus);
  }).inSingletonScope();

  container.bind(TYPES.MarkerGraphRenderer).to(MarkerGraphRenderer).inSingletonScope();

  container.bind(TYPES.Pathfinder).toDynamicValue(() => {
    const logger = container.get<Logger>(TYPES.Logger);
    const eventBus = container.get<EventBus>(TYPES.EventBus);
    const graph = container.get<MarkerGraph>(TYPES.MarkerGraph);
    return new Pathfinder(logger, eventBus, graph);
  }).inSingletonScope();

  container.bind(TYPES.MarkerManager).to(MarkerManager).inSingletonScope();

  // Route
  container.bind(TYPES.RouteManager).to(RouteManager).inSingletonScope();

  // UI
  container.bind(TYPES.UIFactory).to(UIFactory).inSingletonScope();
  container.bind(TYPES.UIManager).to(UIManager).inSingletonScope();

  // UI Components
  container.bind(TYPES.ControlPanel).to(ControlPanel).inSingletonScope();
  container.bind(TYPES.SearchBar).to(SearchBar).inSingletonScope();
  container.bind(TYPES.PopupManager).to(PopupManager).inSingletonScope();
  container.bind(TYPES.MarkerDetailsPanel).to(MarkerDetailsPanel).inSingletonScope();
  container.bind(TYPES.ConnectionScreen).to(ConnectionScreen).inSingletonScope();
  container.bind(TYPES.FPSCounter).to(FPSCounter).inSingletonScope();
  container.bind(TYPES.BuildingTitle).to(BuildingTitle).inSingletonScope();
  container.bind(TYPES.AuthPopup).to(AuthPopup).inSingletonScope();
}

export { container };