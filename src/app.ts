// app.ts
import "reflect-metadata";
import { Logger } from "./core/logger/Logger";

Logger.getInstance().getLogger('App').debug('=== APP STARTING ===');

// Глобальный обработчик ошибок
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  const debug = document.getElementById('debug');
  if (debug) debug.innerHTML = `Error: ${event.error?.message || event.message}`;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  const debug = document.getElementById('debug');
  if (debug) debug.innerHTML = `Promise Error: ${event.reason?.message || event.reason}`;
});

import { container, TYPES } from "./core/di/Container";
import { configureContainer } from "./core/di/ContainerConfig";
import { BabylonEngine } from "./core/engine/BabylonEngine";
import { SceneManager } from "./core/scene/SceneManager";
import { EventBus } from "./core/events/EventBus";
import { EventType } from "./core/events/EventTypes";
import { ConfigService } from "./core/config/ConfigService";

import './styles/main.css';
import './styles/animations.css';
import './styles/components/control-panel.css';
import './styles/components/search-bar.css';
import './styles/components/marker-details-panel.css';
import './styles/components/popup-manager.css';
import './styles/components/connection-screen.css';
import './styles/components/fps-counter.css';
import './styles/components/building-title.css';
import './styles/components/auth-popup.css';

/**
 * Главный класс приложения
 */
class App {
  private engine!: BabylonEngine;
  private sceneManager!: SceneManager;
  private logger!: Logger;
  private eventBus!: EventBus;
  private config!: ConfigService;
  private isRunning: boolean = false;
  private renderLoopId: number | null = null;

  constructor() {
    Logger.getInstance().getLogger('App').debug('App constructor start');
    const debug = document.getElementById('debug');
    if (debug) debug.innerHTML = 'Initializing...';

    try {
      Logger.getInstance().getLogger('App').debug('Configuring container...');
      configureContainer();
      Logger.getInstance().getLogger('App').debug('Container configured');

      Logger.getInstance().getLogger('App').debug('Getting dependencies...');
      this.engine = container.get<BabylonEngine>(TYPES.BabylonEngine);
      this.sceneManager = container.get<SceneManager>(TYPES.SceneManager);
      this.logger = container.get<Logger>(TYPES.Logger).getLogger('App');
      this.eventBus = container.get<EventBus>(TYPES.EventBus);
      this.config = container.get<ConfigService>(TYPES.ConfigService);
      Logger.getInstance().getLogger('App').debug('Dependencies obtained');

      Logger.getInstance().getLogger('App').debug('Setting up event handlers...');
      this.setupEventHandlers();
      this.setupConnectionHandling();
      this.setupLoadingHandlers();

      Logger.getInstance().getLogger('App').debug('Starting app...');
      this.start();

      this.logger.info(`Application initialized (v${this.config.get().version})`);
      Logger.getInstance().getLogger('App').debug('App constructor done');

      if (debug) debug.innerHTML = 'App started!';

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Failed to initialize application:', error);
      if (debug) debug.innerHTML = `Error: ${error.message}`;
      this.showError(error.message);
    }
  }

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
        Logger.getInstance().getLogger('App').debug(`Loading progress: ${(overall * 100).toFixed(1)}%`);
      }
    });

    this.eventBus.on(EventType.LOADING_ERROR, (event) => {
      this.logger.error('Loading error', event.data);
    });

    this.eventBus.on(EventType.MARKER_SELECTED, (event) => {
      this.logger.info(`Marker selected from event: ${event.data.marker?.name}`);
    });
  }

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

  private setupLoadingHandlers(): void {
    this.eventBus.on(EventType.LOADING_PROGRESS, (data: any) => {
      const progress = data.data?.overall || data.overall || 0;
      const component = data.data?.component || data.component || 'ресурсов';
      this.updateLoadingProgress(progress, `Загрузка: ${component}...`);
    });

    this.eventBus.on(EventType.LOADING_START, () => {
      this.updateLoadingProgress(0, 'Начало загрузки...');
    });

    this.eventBus.on(EventType.LOADING_COMPLETE, () => {
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 500);
    });

    this.eventBus.on(EventType.LOADING_ERROR, (data: any) => {
      this.hideLoadingScreen();
      const errorData = data.data || data;
      const errorMessage = errorData.error?.message || errorData.error || errorData.message || "Неизвестная ошибка";
      this.showError(`Ошибка загрузки: ${errorMessage}`);
    });
  }

  private updateLoadingProgress(progress: number, status: string): void {
    const percent = Math.floor(progress * 100);
    const bar = document.getElementById('loading-bar');
    const percentEl = document.getElementById('loading-percent');
    const statusEl = document.getElementById('loading-status');

    if (bar) bar.style.width = `${percent}%`;
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (statusEl) statusEl.textContent = status;

    if (this.config.isDebug() && (percent === 0 || percent === 50 || percent === 100)) {
      Logger.getInstance().getLogger('App').debug(`Loading progress: ${percent}%`);
    }
  }

  private hideLoadingScreen(): void {
    const loadingEl = document.getElementById('app-loading');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
      setTimeout(() => {
        loadingEl.style.display = 'none';
      }, 500);
    }
  }

  private async start(): Promise<void> {
    try {
      this.logger.info('Starting application...');

      const modelUrl = this.config.get().modelUrl;
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
      }

      // 3. Создаём маркеры
      if (markerManager) {
        this.logger.info('Creating markers...');
        await markerManager.initialize();

        markerManager.setAllMarkersVisible(false);
        this.logger.info('Markers created and hidden');
      }

      // 4. Делаем здание видимым
      if (buildingManager && buildingManager.data) {
        buildingManager.data.elements.forEach(element => {
          element.mesh.isVisible = true;
          element.isVisible = true;
        });
      }

      // 5. Показываем сцену
      await this.sceneManager.showScene();

      // 6. Запускаем рендер-луп
      this.startRenderLoop();

      // 7. Запускаем анимации с небольшой задержкой
      if (cameraManager) {
        setTimeout(() => {
          this.logger.info('Starting camera intro animation...');
          cameraManager.initialize();
        }, 300);
      }

      // 8. Анимацию строительства запускаем последней
      if (buildingManager && buildingManager.isLoaded) {
        setTimeout(async () => {
          this.logger.info('Starting construction animation...');
          await buildingManager.animateConstruction();

          if (markerManager) {
            // Применяем логику видимости из MarkerManager
            markerManager.setCurrentFloor('all');
            markerManager.updateMarkersVisibility();
            this.logger.info('Markers visibility updated after construction animation');
          }
        }, 500);
      }

      this.logger.info('Application started successfully');

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to start application', error);
      this.showError(error.message);
    }
  }

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

  private showError(errorMessage: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff4444;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      max-width: 90%;
      word-break: break-word;
      text-align: center;
    `;
    errorDiv.textContent = `❌ Error: ${errorMessage}`;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  public dispose(): void {
    this.stop();
    this.sceneManager.dispose();
    this.engine.dispose();
    this.logger.info('Application disposed');
  }
}

window.addEventListener('load', () => {
  Logger.getInstance().getLogger('App').debug('Window loaded');
  try {
    const app = new App();
    (window as any).__APP__ = app;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Failed to create app instance:', error);
  }
});