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
  const bindSingleton = <T>(serviceId: symbol, implementation: new (...args: any[]) => T): void => {
    container.bind<T>(serviceId).to(implementation).inSingletonScope();
  };

  const bindFactory = <T>(serviceId: symbol, factory: () => T): void => {
    container.bind<T>(serviceId).toDynamicValue(factory).inSingletonScope();
  };

  bindSingleton(TYPES.BabylonEngine, BabylonEngine);
  container.bind<Logger>(TYPES.Logger).toConstantValue(logger);
  bindSingleton(TYPES.EventBus, EventBus);
  bindSingleton(TYPES.ConfigService, ConfigService);
  bindSingleton(TYPES.AssetLoader, AssetLoader);
  bindSingleton(TYPES.ResourceCache, ResourceCache);
  bindSingleton(TYPES.PerformanceTracker, PerformanceTracker);
  bindSingleton(TYPES.SceneManager, SceneManager);

  bindFactory(TYPES.CameraAnimator, () => new CameraAnimator());
  bindFactory(TYPES.CameraModeManager, () => new CameraModeManager());
  bindFactory(TYPES.CameraInputHandler, () => new CameraInputHandler());

  bindFactory(TYPES.CameraManager, () => {
    const logger = container.get<Logger>(TYPES.Logger);
    const eventBus = container.get<EventBus>(TYPES.EventBus);
    const animator = container.get<CameraAnimator>(TYPES.CameraAnimator);
    const modeManager = container.get<CameraModeManager>(TYPES.CameraModeManager);
    const inputHandler = container.get<CameraInputHandler>(TYPES.CameraInputHandler);
    return new CameraManager(logger, eventBus, animator, modeManager, inputHandler);
  });

  bindSingleton(TYPES.BackgroundManager, BackgroundManager);
  bindSingleton(TYPES.GridManager, GridManager);
  bindSingleton(TYPES.LightingManager, LightingManager);
  bindSingleton(TYPES.BuildingManager, BuildingManager);
  bindSingleton(TYPES.FloorManager, FloorManager);
  bindSingleton(TYPES.WallManager, WallManager);
  bindSingleton(TYPES.FloorExpander, FloorExpander);
  bindSingleton(TYPES.BuildingLoader, BuildingLoader);
  bindSingleton(TYPES.BuildingParser, BuildingParser);
  bindSingleton(TYPES.BuildingAnimator, BuildingAnimator);

  bindFactory(TYPES.MarkerGraph, () => {
    const eventBus = container.get<EventBus>(TYPES.EventBus);
    return new MarkerGraph(eventBus);
  });

  bindSingleton(TYPES.MarkerGraphRenderer, MarkerGraphRenderer);

  bindFactory(TYPES.Pathfinder, () => {
    const logger = container.get<Logger>(TYPES.Logger);
    const eventBus = container.get<EventBus>(TYPES.EventBus);
    const graph = container.get<MarkerGraph>(TYPES.MarkerGraph);
    return new Pathfinder(logger, eventBus, graph);
  });

  bindSingleton(TYPES.MarkerManager, MarkerManager);
  bindSingleton(TYPES.RouteManager, RouteManager);
  bindSingleton(TYPES.UIFactory, UIFactory);
  bindSingleton(TYPES.UIManager, UIManager);
  bindSingleton(TYPES.ControlPanel, ControlPanel);
  bindSingleton(TYPES.SearchBar, SearchBar);
  bindSingleton(TYPES.PopupManager, PopupManager);
  bindSingleton(TYPES.MarkerDetailsPanel, MarkerDetailsPanel);
  bindSingleton(TYPES.ConnectionScreen, ConnectionScreen);
  bindSingleton(TYPES.FPSCounter, FPSCounter);
  bindSingleton(TYPES.BuildingTitle, BuildingTitle);
  bindSingleton(TYPES.AuthPopup, AuthPopup);
}

export { container };
