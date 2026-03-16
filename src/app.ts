import { BabylonEngine } from "./core/engine/BabylonEngine";
import { SceneManager } from "./core/scene/SceneManager";
import { LoadingScreen } from "./ui/LoadingScreen";
import { ConnectionScreen } from "./ui/ConnectionScreen";
import { FPSCounter } from "./utils/FPSCounter";

class App {
  private _engine: BabylonEngine;
  private _sceneManager: SceneManager;
  private _fpsCounter: FPSCounter;
  private _loadingScreen: LoadingScreen;
  private _connectionScreen: ConnectionScreen;
  private _modelUrl: string = '/models/building.glb';
  
  // Таймер для производительности
  private _lastTime: number = performance.now();

  constructor() {
    // Создаём экраны
    this._loadingScreen = new LoadingScreen();
    this._connectionScreen = new ConnectionScreen();
    
    // Показываем экран загрузки
    this._loadingScreen.show();
    this._loadingScreen.setStatus('Инициализация движка...');
    this._loadingScreen.updateProgress(0);

    // Инициализируем движок
    this._engine = BabylonEngine.getInstance();
    this._sceneManager = SceneManager.getInstance();
    this._fpsCounter = new FPSCounter();

    // Настраиваем обработку соединения
    this.setupConnectionHandling();

    // Загружаем все ресурсы
    this.loadAllResources();

    // Запускаем рендер-цикл с замером производительности
    this._engine.runRenderLoop(() => {
      const now = performance.now();
      const deltaTime = (now - this._lastTime) / 1000; // в секундах
      this._lastTime = now;
      
      // Рендерим сцену
      this._sceneManager.render(deltaTime);
      
      // Обновляем FPS счётчик
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
    // Обработка потери интернет-соединения
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

    // Кнопка повторной попытки
    this._connectionScreen.setRetryCallback(() => {
      this._connectionScreen.hide();
      this.loadAllResources();
    });

    // Проверка при старте
    if (!navigator.onLine) {
      this._connectionScreen.show('Нет интернет соединения');
    }
  }

  private async loadAllResources(): Promise<void> {
    try {
      this._loadingScreen.show();
      this._loadingScreen.setStatus('Проверка соединения...');
      this._loadingScreen.updateProgress(0);

      // 1. Проверяем доступность модели
      const isAvailable = await this.checkModelAvailability(this._modelUrl);
      
      if (!isAvailable) {
        // Если модель недоступна - показываем экран ошибки
        this._loadingScreen.hide();
        this._connectionScreen.showError('Сервер с моделью недоступен. Проверьте соединение.');
        return;
      }

      // 2. Если модель доступна - продолжаем загрузку
      this._loadingScreen.setStatus('Загрузка ресурсов...');
      
      await this._sceneManager.loadAll(
        this._modelUrl,
        (progress: number, stage: string) => {
          this._loadingScreen.updateProgress(progress);
          this._loadingScreen.setStatus(stage);
        }
      );
      
      // 3. Успешная загрузка
      await this._loadingScreen.hide();
      await this._sceneManager.showScene();
      
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      this._loadingScreen.hide();
      
      // Определяем тип ошибки
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        this._connectionScreen.showError('Сервер недоступен. Проверьте соединение.');
      } else {
        this._connectionScreen.showError('Не удалось загрузить модель здания');
      }
    }
  }

  /**
   * Проверка доступности модели на сервере
   */
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

// Запускаем приложение
window.addEventListener('load', () => {
  new App();
});