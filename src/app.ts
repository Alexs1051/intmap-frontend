import './styles/main.css';
import './styles/animations.css';

import { BabylonEngine } from "./core/engine/BabylonEngine";
import { SceneManager } from "./core/scene/SceneManager";
import { UIManager } from "./features/ui/UIManager";
import { ConnectionScreen } from "./features/ui/components/ConnectionScreen";
import { FPSCounter } from "./features/ui/components/FPSCounter";
import { logger } from "./core/logger/Logger";

const appLogger = logger.getLogger('App');

class App {
  private _engine: BabylonEngine;
  private _sceneManager: SceneManager;
  private _fpsCounter: FPSCounter;
  private _uiManager: UIManager;
  private _connectionScreen: ConnectionScreen;
  private _modelUrl: string = '/models/building.glb';
  private _lastTime: number = performance.now();

  constructor() {
    this._uiManager = UIManager.getInstance();
    this._connectionScreen = new ConnectionScreen();
    
    this._uiManager.showLoading('Инициализация движка...');
    this._uiManager.updateLoadingProgress(0);

    this._engine = BabylonEngine.getInstance();
    this._sceneManager = SceneManager.getInstance(this._uiManager);
    this._fpsCounter = new FPSCounter();

    this.setupConnectionHandling();
    this.loadAllResources();

    this._engine.runRenderLoop(() => {
      const now = performance.now();
      const deltaTime = (now - this._lastTime) / 1000;
      this._lastTime = now;
      
      this._sceneManager.render(deltaTime);
      this._fpsCounter.update();
    });
    
    appLogger.info("Приложение инициализировано");
  }

  private setupConnectionHandling(): void {
    window.addEventListener('offline', () => {
      appLogger.warn("Интернет соединение потеряно");
      this._connectionScreen.show('Интернет соединение потеряно');
    });

    window.addEventListener('online', () => {
      appLogger.info("Интернет соединение восстановлено");
      if (this._connectionScreen.isVisible) this._connectionScreen.hide();
    });

    this._connectionScreen.setRetryCallback(() => {
      this._connectionScreen.hide();
      this.loadAllResources();
    });

    if (!navigator.onLine) {
      this._connectionScreen.show('Нет интернет соединения');
    }
  }

  private async loadAllResources(): Promise<void> {
    try {
      appLogger.info("Начинаем загрузку ресурсов");
      
      if (!await this.checkModelAvailability(this._modelUrl)) {
        throw new Error("Модель недоступна");
      }

      await this._sceneManager.loadAll(this._modelUrl);
      await this._uiManager.hideLoading();
      await this._sceneManager.showScene();
      
      appLogger.info("Загрузка ресурсов завершена");
    } catch (error) {
      appLogger.error("Ошибка загрузки", error);
      this._uiManager.hideLoading();
      this._connectionScreen.showError(
        error.message?.includes('Failed to fetch') 
          ? 'Сервер недоступен. Проверьте соединение.'
          : 'Не удалось загрузить модель здания'
      );
    }
  }

  private async checkModelAvailability(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      appLogger.warn("Модель недоступна", error);
      return false;
    }
  }
}

window.addEventListener('load', () => new App());