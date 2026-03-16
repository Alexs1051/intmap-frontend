import { BabylonEngine } from "./core/engine/BabylonEngine";
import { SceneManager } from "./core/scene/SceneManager";
import { UIManager } from "./features/ui/UIManager";
import { ConnectionScreen } from "./features/ui/components/ConnectionScreen";
import { FPSCounter } from "./features/ui/components/FPSCounter";

class App {
  private _engine: BabylonEngine;
  private _sceneManager: SceneManager;
  private _fpsCounter: FPSCounter;
  private _uiManager: UIManager;
  private _connectionScreen: ConnectionScreen;
  private _modelUrl: string = '/models/building.glb';
  
  private _lastTime: number = performance.now();

  constructor() {
    console.log("📱 Создаём UIManager");
    this._uiManager = UIManager.getInstance();
    this._connectionScreen = new ConnectionScreen();
    
    // Показываем экран загрузки через UIManager
    this._uiManager.showLoading('Инициализация движка...');
    this._uiManager.updateLoadingProgress(0);

    console.log("⚙️ Инициализируем BabylonEngine");
    this._engine = BabylonEngine.getInstance();
    
    // Передаём UIManager в SceneManager
    console.log("📤 Передаём UIManager в SceneManager");
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

    this.setupInspector();
  }

  private setupInspector(): void {
    window.addEventListener("keydown", (ev) => {
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.key === "I") {
        const scene = this._sceneManager.scene;
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide();
        } else {
          scene.debugLayer.show();
        }
      }
    });
  }

  private setupConnectionHandling(): void {
    window.addEventListener('offline', () => {
      console.warn('⚠️ Интернет соединение потеряно');
      this._connectionScreen.show('Интернет соединение потеряно');
    });

    window.addEventListener('online', () => {
      console.log('✅ Интернет соединение восстановлено');
      if (this._connectionScreen.isVisible) {
        this._connectionScreen.hide();
      }
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
      console.log("📥 Начинаем загрузку ресурсов...");
      
      const isAvailable = await this.checkModelAvailability(this._modelUrl);
      
      if (!isAvailable) {
        console.error("❌ Модель недоступна");
        this._uiManager.hideLoading();
        this._connectionScreen.showError('Сервер с моделью недоступен. Проверьте соединение.');
        return;
      }

      // Загружаем ресурсы
      await this._sceneManager.loadAll(this._modelUrl);
      
      // Скрываем экран загрузки
      console.log("✅ Загрузка завершена, скрываем экран");
      await this._uiManager.hideLoading();
      
      // Показываем сцену с анимациями
      console.log("🎬 Запуск анимаций сцены");
      await this._sceneManager.showScene();
      
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      this._uiManager.hideLoading();
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        this._connectionScreen.showError('Сервер недоступен. Проверьте соединение.');
      } else {
        this._connectionScreen.showError('Не удалось загрузить модель здания');
      }
    }
  }

  private async checkModelAvailability(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Модель недоступна:', error);
      return false;
    }
  }
}

window.addEventListener('load', () => {
  new App();
});