// app.ts
import "reflect-metadata";
import { Logger } from "@core/logger/logger";
import { showCriticalError, updateDebug } from "@core/utils/ui-helpers";

const bootstrapLogger = Logger.getInstance().getLogger('App');
bootstrapLogger.debug('=== APP STARTING ===');

import { container, TYPES } from "@core/di/container";
import { configureContainer } from "@core/di/container-config";
import { BabylonEngine } from "@core/engine/babylon-engine";
import { SceneManager } from "@core/scene/scene-manager";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { BuildingApi } from "@core/api/building-api";
import { ConfigService } from "@core/config/config-service";
import { LoadingHandler } from "@core/ui/loading-handler";
import { getQueryParam } from "@shared/utils/url.utils";

import './styles/main.css';

/**
 * Главный класс приложения
 */
class App {
  private engine!: BabylonEngine;
  private sceneManager!: SceneManager;
  private logger!: Logger;
  private eventBus!: EventBus;
  private config!: ConfigService;
  private loadingHandler!: LoadingHandler;
  private buildingApi!: BuildingApi;
  private isRunning: boolean = false;
  private renderLoopId: number | null = null;

  constructor() {
    this.logger = Logger.getInstance().getLogger('App');
    this.logger.debug('App constructor start');
    updateDebug('Initializing...');

    try {
      configureContainer();
      this.logger.debug('Container configured');

      this.initDependencies();
      this.logger.debug('Dependencies obtained');

      this.setupEventHandlers();
      this.setupConnectionHandling();
      this.setupLoadingHandlers();

      this.start();

      this.logger.info(`Application initialized (v${this.config.get().version})`);
      updateDebug('App started!');

    } catch (err) {
      this.handleInitError(err);
    }
  }

  /**
   * Инициализировать зависимости из DI контейнера
   */
  private initDependencies(): void {
    this.engine = container.get<BabylonEngine>(TYPES.BabylonEngine);
    this.sceneManager = container.get<SceneManager>(TYPES.SceneManager);
    this.eventBus = container.get<EventBus>(TYPES.EventBus);
    this.config = container.get<ConfigService>(TYPES.ConfigService);
    this.buildingApi = new BuildingApi();
  }

  /**
   * Настроить обработчики событий
   */
  private setupEventHandlers(): void {
    window.addEventListener('error', (event) => {
      this.logger.error('Global error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
      this.eventBus.emit(EventType.ERROR_OCCURRED, { error: event.error });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logger.error('Unhandled promise rejection', event.reason);
      this.eventBus.emit(EventType.ERROR_OCCURRED, { error: event.reason });
    });

    this.eventBus.on(EventType.LOADING_PROGRESS, (event) => {
      const overall = event.data.overall || 0;
      if (this.config.isDebug() && (overall === 0 || overall === 0.5 || overall === 1)) {
        this.logger.debug(`Loading progress: ${(overall * 100).toFixed(1)}%`);
      }
    });

    this.eventBus.on(EventType.LOADING_ERROR, (event) => {
      this.logger.error('Loading error', event.data);
    });

    this.eventBus.on(EventType.MARKER_SELECTED, (event) => {
      this.logger.info(`Marker selected from event: ${event.data.marker?.name}`);
    });
  }

  /**
   * Настроить обработку состояния соединения
   */
  private setupConnectionHandling(): void {
    const handleOnline = () => {
      this.logger.info('Connection restored');
      this.eventBus.emit(EventType.CONNECTION_STATUS_CHANGED, { online: true });
    };

    const handleOffline = () => {
      this.logger.warn('Connection lost');
      this.eventBus.emit(EventType.CONNECTION_STATUS_CHANGED, { online: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      handleOffline();
    }
  }

  /**
   * Настроить обработчики загрузки
   */
  private setupLoadingHandlers(): void {
    this.loadingHandler = new LoadingHandler(this.eventBus, this.config);
    this.loadingHandler.setup();
  }

  /**
   * Обработка ошибки инициализации
   */
  private handleInitError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.logger.error('Failed to initialize application', error);
    updateDebug(`Error: ${error.message}`);
    showCriticalError(error.message);
  }

  /**
   * Определяет стартовую backend-модель для первого рендера сцены.
   */
  private async start(): Promise<void> {
    try {
      this.logger.info('Starting application...');

      const modelUrl = await this.resolveStartupModel();
      this.logger.info(`Loading model from: ${modelUrl}`);

      // 1. Загружаем все ресурсы
      await this.sceneManager.loadAll(modelUrl);

      // 2. Получаем менеджеры
      const buildingManager = this.sceneManager.getBuildingManager();
      const cameraManager = this.sceneManager.getCameraManager();
      const markerManager = this.sceneManager.getMarkerManager();

      if (buildingManager && buildingManager.isLoaded) {
        const dimensions = buildingManager.dimensions;
        const center = buildingManager.center;

        this.logger.info(`Building loaded: ${dimensions.height}x${dimensions.width}x${dimensions.depth}`);

        if (cameraManager) {
          cameraManager.setDimensions(dimensions);
          cameraManager.setTargetPosition(center);
        }

        // Устанавливаем WallManager в MarkerManager для правильного порядка рендеринга
        if (markerManager && buildingManager.wallManager) {
          markerManager.setWallManager(buildingManager.wallManager);
          this.logger.info('WallManager set in MarkerManager');
        }
      }

      // 3. Делаем здание видимым
      if (buildingManager && buildingManager.data) {
        buildingManager.data.elements.forEach(element => {
          element.mesh.isVisible = true;
          element.isVisible = true;
        });
      }

      // 4. Показываем сцену
      await this.sceneManager.showScene();

      // 5. Запускаем рендер-луп
      this.startRenderLoop();

      await this.runInitialSceneReveal(cameraManager, buildingManager, markerManager);

      this.logger.info('Application started successfully');

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to start application', error);
      showCriticalError(error.message);
    }
  }

  /**
   * Получает стартовое здание из backend-каталога с учётом query-параметра `b`.
   */
  private async resolveStartupModel(): Promise<string | string[]> {
    try {
      const buildingOptions = await this.buildingApi.getBuildingOptions();
      if (buildingOptions.length === 0) {
        throw new Error('Модели в БД не найдены');
      }

      const requestedBuildingId = getQueryParam('b')?.trim();
      const selectedBuilding = requestedBuildingId
        ? buildingOptions.find((building) => building.id === requestedBuildingId || building.buildingCode === requestedBuildingId)
        : undefined;

      const startupBuilding = selectedBuilding ?? buildingOptions[0];
      if (!startupBuilding) {
        throw new Error('Модели в БД не найдены');
      }

      return startupBuilding.modelUrls?.length
        ? startupBuilding.modelUrls
        : (startupBuilding.modelUrl ?? (() => { throw new Error('Модели в БД не найдены'); })());
    } catch (error) {
      this.logger.error('Failed to resolve startup building from backend', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Не удалось получить модели с backend');
    }
  }

  /**
   * Запускает основной render loop Babylon-сцены.
   */
  private startRenderLoop(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    let lastTime = performance.now();

    const render = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      const deltaTime = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;

      try {
        this.sceneManager.render(deltaTime);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error('Render error', error);
        this.stop();
      }

      this.renderLoopId = requestAnimationFrame(render);
    };

    this.renderLoopId = requestAnimationFrame(render);
    this.logger.debug('Render loop started');
  }

  private async runInitialSceneReveal(
    cameraManager: ReturnType<SceneManager['getCameraManager']>,
    buildingManager: ReturnType<SceneManager['getBuildingManager']>,
    markerManager: ReturnType<SceneManager['getMarkerManager']>
  ): Promise<void> {
    if (!cameraManager || !buildingManager || !buildingManager.isLoaded) {
      return;
    }

    markerManager?.setMarkersMuted(true);
    await new Promise((resolve) => setTimeout(resolve, 320));

    this.logger.info('Starting camera and construction intro animations...');
    await Promise.all([
      cameraManager.initialize(),
      buildingManager.animateConstruction()
    ]);

    if (markerManager) {
      const floorManager = buildingManager.floorManager;
      const currentFloor = floorManager.getViewMode() === 'single'
        ? floorManager.currentFloor
        : 'all';
      markerManager.setCurrentFloor(currentFloor);
      markerManager.setMarkersMuted(false);
      markerManager.updateMarkersVisibility();
      this.logger.info('Markers visibility updated after intro animations');
    }
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.renderLoopId !== null) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }
    this.engine.stopRenderLoop();
    this.logger.info('Application stopped');
  }

  public dispose(): void {
    this.stop();
    this.sceneManager.dispose();
    this.engine.dispose();
    this.logger.info('Application disposed');
  }
}

window.addEventListener('load', () => {
  bootstrapLogger.debug('Window loaded');
  try {
    const app = new App();
    (window as any).__APP__ = app;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    bootstrapLogger.error('Failed to create app instance', error);
  }
});
