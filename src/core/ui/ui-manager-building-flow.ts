import { BuildingApi } from "@core/api/building-api";
import { Logger } from "@core/logger/logger";
import { RouteManager } from "@core/route/route-manager";
import { CameraMode, BuildingOption } from "@shared/types";
import {
  IBuildingManager,
  IBuildingTitle,
  ICameraManager,
  IControlPanel,
  IMarkerDetailsPanel,
  IMarkerManager,
  IPopupManager,
  ISearchBar
} from "@shared/interfaces";

export interface UIManagerBuildingFlowContext {
  buildingTitle?: IBuildingTitle;
  buildingManager?: IBuildingManager;
  markerManager?: IMarkerManager;
  cameraManager?: ICameraManager;
  controlPanel?: IControlPanel;
  markerDetailsPanel?: IMarkerDetailsPanel;
  searchBar?: ISearchBar;
  popupManager?: IPopupManager;
  routeManager: RouteManager;
  showLoading(status: string, progress?: number): void;
  updateLoadingProgress(progress: number, status?: string): void;
  hideLoading(): void;
  refreshFloorButtons(): void;
  syncCurrentBuildingContext(): void;
  syncControlModeButton(showMessage?: boolean): void;
  processPendingDeepLink(): Promise<void>;
  waitForNextFrame(): Promise<void>;
}

export class UIManagerBuildingFlow {
  constructor(
    private readonly buildingApi: BuildingApi,
    private readonly logger: Logger
  ) {}

  public async initializeBuildingCatalog(context: UIManagerBuildingFlowContext, pendingBuildingId?: string): Promise<void> {
    try {
      const buildingOptions = await this.buildingApi.getBuildingOptions();
      if (buildingOptions.length > 0) {
        const selectedId = pendingBuildingId ?? buildingOptions[0]?.id;
        context.buildingTitle?.setBuildings(buildingOptions, selectedId);
        context.routeManager.setCurrentBuilding(context.buildingTitle?.selectedBuilding ?? null);
        context.markerManager?.setCurrentBuilding(context.buildingTitle?.selectedBuilding ?? null);
        context.syncCurrentBuildingContext();

        if (this.shouldReuseInitialScene(context)) {
          await this.initializeCurrentBuildingWithoutReload(context);
        } else {
          await this.reloadSelectedBuilding(context, false);
        }
        return;
      }

      this.logger.error('No building models returned from backend');
      context.popupManager?.error('Модели в БД не найдены');
    } catch (error) {
      this.logger.error('Failed to load building catalog from backend', error);
      context.popupManager?.error('Не удалось загрузить модели с backend');
    }
  }

  public async refreshSceneAccessState(context: UIManagerBuildingFlowContext): Promise<void> {
    try {
      context.controlPanel?.setButtonsEnabled(false);
      context.showLoading('Обновление доступов...', 0.08);
      const currentBuildingId = context.buildingTitle?.selectedBuilding?.id;
      const buildingOptions = await this.buildingApi.getBuildingOptions();
      context.updateLoadingProgress(0.26, 'Проверка доступных зданий...');

      if (buildingOptions.length > 0) {
        context.buildingTitle?.setBuildings(buildingOptions, currentBuildingId ?? buildingOptions[0]?.id);
        context.syncCurrentBuildingContext();
        await this.reloadSelectedBuilding(context, false, false);
      } else {
        await context.markerManager?.initialize();
        context.markerManager?.updateMarkersVisibility();
        context.searchBar?.refreshMarkers();
        context.refreshFloorButtons();
        context.hideLoading();
      }
    } catch (error) {
      this.logger.error('Failed to refresh scene access state after auth change', error);
      try {
        await context.markerManager?.initialize();
        context.markerManager?.updateMarkersVisibility();
        context.searchBar?.refreshMarkers();
        context.refreshFloorButtons();
      } catch (nestedError) {
        this.logger.error('Fallback scene access refresh also failed', nestedError);
      }
      context.hideLoading();
    } finally {
      context.controlPanel?.setButtonsEnabled(true);
    }
  }

  public async reloadSelectedBuilding(
    context: UIManagerBuildingFlowContext,
    showToast: boolean,
    manageLoading: boolean = true
  ): Promise<void> {
    if (!context.buildingTitle?.selectedBuilding?.modelUrl || !context.buildingManager || !context.markerManager || !context.cameraManager) {
      return;
    }

    const selectedBuilding = context.buildingTitle.selectedBuilding;
    if (!selectedBuilding?.modelUrl) {
      return;
    }

    const selectedModel = selectedBuilding.modelUrls?.length ? selectedBuilding.modelUrls : selectedBuilding.modelUrl;

    context.controlPanel?.setButtonsEnabled(false);
    context.markerDetailsPanel?.hide();
    context.routeManager.resetRoute();

    try {
      if (manageLoading) {
        context.showLoading(`Подготовка ${selectedBuilding.name}...`, 0.06);
      } else {
        context.updateLoadingProgress(0.34, `Подготовка ${selectedBuilding.name}...`);
      }

      context.markerManager.setCurrentBuilding(selectedBuilding);
      context.routeManager.setCurrentBuilding(selectedBuilding);
      context.markerManager.setMarkersMuted(true);

      context.updateLoadingProgress(0.18, 'Обновление структуры здания...');
      await context.buildingManager.reloadBuilding(selectedModel);

      context.updateLoadingProgress(0.46, 'Загрузка навигационных данных...');
      await context.markerManager.initialize();

      context.updateLoadingProgress(0.64, 'Подготовка камеры...');
      context.cameraManager.setDimensions(context.buildingManager.dimensions);
      context.cameraManager.setTargetPosition(context.buildingManager.center);
      await context.cameraManager.switchToMode(CameraMode.FREE_FLIGHT);
      context.syncCurrentBuildingContext();

      const floorManager = context.buildingManager.floorManager;
      context.markerManager.setCurrentFloor(
        floorManager.getViewMode() === 'single' ? floorManager.currentFloor : 'all'
      );

      context.searchBar?.refreshMarkers();
      context.refreshFloorButtons();
      context.syncControlModeButton(false);

      context.updateLoadingProgress(0.88, 'Запуск анимации сцены...');
      await context.waitForNextFrame();
      context.hideLoading();

      await Promise.all([
        context.cameraManager.initialize(),
        context.buildingManager.animateConstruction()
      ]);
      context.markerManager.setMarkersMuted(false);
      context.markerManager.updateMarkersVisibility();
      await context.processPendingDeepLink();

      if (showToast) {
        context.popupManager?.success(`Загружено: ${selectedBuilding.name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to switch building', error);
      context.markerManager?.setMarkersMuted(false);
      context.hideLoading();
      context.popupManager?.error(`Не удалось загрузить ${selectedBuilding.name}: ${message}`);
    } finally {
      context.hideLoading();
      context.controlPanel?.setButtonsEnabled(true);
    }
  }

  public shouldReuseInitialScene(context: UIManagerBuildingFlowContext): boolean {
    return Boolean(context.buildingManager?.isLoaded && context.cameraManager && context.markerManager);
  }

  public async initializeCurrentBuildingWithoutReload(context: UIManagerBuildingFlowContext): Promise<void> {
    if (!context.buildingManager || !context.markerManager || !context.cameraManager || !context.buildingTitle?.selectedBuilding) {
      return;
    }

    const selectedBuilding: BuildingOption = context.buildingTitle.selectedBuilding;
    context.markerManager.setCurrentBuilding(selectedBuilding);
    context.routeManager.setCurrentBuilding(selectedBuilding);
    context.markerManager.setMarkersMuted(true);

    await context.markerManager.initialize();
    context.cameraManager.setDimensions(context.buildingManager.dimensions);
    context.cameraManager.setTargetPosition(context.buildingManager.center);

    const floorManager = context.buildingManager.floorManager;
    context.markerManager.setCurrentFloor(
      floorManager.getViewMode() === 'single' ? floorManager.currentFloor : 'all'
    );

    context.searchBar?.refreshMarkers();
    context.refreshFloorButtons();
    context.syncControlModeButton(false);
  }
}
