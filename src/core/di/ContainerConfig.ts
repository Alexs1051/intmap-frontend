// ContainerConfig.ts
import { container, TYPES } from "./Container";
import { BabylonEngine } from "../engine/BabylonEngine";
import { Logger, logger } from "../logger/Logger";
import { EventBus } from "../events/EventBus";
import { ConfigService } from "../config/ConfigService";
import { AssetLoader } from "../assets/AssetLoader";
import { ResourceCache } from "../assets/ResourceCache";
import { SceneManager } from "../scene/SceneManager";

// Импортируем менеджеры
import { CameraManager } from "../../features/camera/CameraManager";
import { CameraAnimator } from "../../features/camera/CameraAnimator";
import { CameraModeManager } from "../../features/camera/CameraModeManager";
import { CameraInputHandler } from "../../features/camera/CameraInputHandler";
import { BackgroundManager } from "../../features/background/BackgroundManager";
import { GridManager } from "../../features/grid/GridManager";
import { LightingManager } from "../../features/lighting/LightingManager";

// Импортируем Building компоненты
import { BuildingLoader } from "../../features/building/BuildingLoader";
import { BuildingParser } from "../../features/building/BuildingParser";
import { BuildingAnimator } from "../../features/building/BuildingAnimator";
import { FloorManager } from "../../features/building/FloorManager";
import { WallManager } from "../../features/building/WallManager";
import { BuildingManager } from "../../features/building/BuildingManager";

// Импортируем Marker компоненты
import { MarkerWidget } from "../../features/markers/components/MarkerWidget";
import { MarkerAnimator } from "../../features/markers/MarkerAnimator";
import { MarkerManager } from "../../features/markers/MarkerManager";
import { MarkerGraph } from "../../features/markers/graph/MarkerGraph";
import { MarkerGraphRenderer } from "../../features/markers/graph/MarkerGraphRenderer";
import { Pathfinder } from "../../features/markers/Pathfinder";

// Импортируем UI компоненты
import { UIFactory } from "../ui/UIFactory";
import { UIManager } from "../ui/UIManager";
import { ControlPanel } from "../../features/ui/ControlPanel";
import { SearchBar } from "../../features/ui/SearchBar";
import { PopupManager } from "../../features/ui/PopupManager";
import { MarkerDetailsPanel } from "../../features/ui/MarkerDetailsPanel";
import { ConnectionScreen } from "../../features/ui/ConnectionScreen";
import { FPSCounter } from "../../features/ui/FPSCounter";
import { BuildingTitle } from "../../features/ui/BuildingTitle";
import { AuthPopup } from "../../features/ui/AuthPopup";
import {
  ICameraAnimator,
  ICameraInputHandler,
  ICameraManager,
  ICameraModeManager
} from "@shared/interfaces";



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
  container.bind<SceneManager>(TYPES.SceneManager).to(SceneManager).inSingletonScope();

  // Camera components (привязываем к интерфейсам)
  container.bind<ICameraAnimator>(TYPES.CameraAnimator).to(CameraAnimator).inSingletonScope();
  container.bind<ICameraModeManager>(TYPES.CameraModeManager).to(CameraModeManager).inSingletonScope();
  container.bind<ICameraInputHandler>(TYPES.CameraInputHandler).to(CameraInputHandler).inSingletonScope();
  container.bind<ICameraManager>(TYPES.CameraManager).to(CameraManager).inSingletonScope();

  // Feature Managers
  container.bind(TYPES.BackgroundManager).to(BackgroundManager).inSingletonScope();
  container.bind(TYPES.GridManager).to(GridManager).inSingletonScope();
  container.bind(TYPES.LightingManager).to(LightingManager).inSingletonScope();
  container.bind(TYPES.BuildingManager).to(BuildingManager).inSingletonScope();
  container.bind(TYPES.FloorManager).to(FloorManager).inSingletonScope();
  container.bind(TYPES.WallManager).to(WallManager).inSingletonScope();

  // Building Components
  container.bind(TYPES.BuildingLoader).to(BuildingLoader).inSingletonScope();
  container.bind(TYPES.BuildingParser).to(BuildingParser).inSingletonScope();
  container.bind(TYPES.BuildingAnimator).to(BuildingAnimator).inSingletonScope();

  // Marker components
  container.bind(TYPES.MarkerWidget).to(MarkerWidget).inSingletonScope();
  container.bind(TYPES.MarkerAnimator).to(MarkerAnimator).inSingletonScope();
  container.bind(TYPES.MarkerGraph).to(MarkerGraph).inSingletonScope();
  container.bind(TYPES.MarkerGraphRenderer).to(MarkerGraphRenderer).inSingletonScope();
  container.bind(TYPES.Pathfinder).to(Pathfinder).inSingletonScope();
  container.bind(TYPES.MarkerManager).to(MarkerManager).inSingletonScope();

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