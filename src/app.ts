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
    // Обработка потери соединения
    window.addEventListener('offline', () => {
      console.warn('⚠️ Соединение потеряно');
      this._connectionScreen.show('Соединение с интернетом потеряно');
    });

    window.addEventListener('online', () => {
      console.log('✅ Соединение восстановлено');
      if (this._connectionScreen.isVisible) {
        this._connectionScreen.hide();
        // Пробуем перезагрузить все ресурсы
        this.loadAllResources();
      }
    });

    // Настраиваем кнопку повторной попытки
    this._connectionScreen.setRetryCallback(() => {
      this._connectionScreen.hide();
      this._loadingScreen.show();
      this._loadingScreen.setStatus('Повторная попытка загрузки...');
      this._loadingScreen.updateProgress(0);
      this.loadAllResources();
    });

    // Проверка на начальное отсутствие соединения
    if (!navigator.onLine) {
      this._connectionScreen.show('Нет соединения с интернетом');
    }
  }

  /**
   * Загрузка всех ресурсов с реальным прогрессом по этапам
   */
  private async loadAllResources(): Promise<void> {
    try {
      this._loadingScreen.show();
      this._loadingScreen.setStatus('Подготовка к загрузке...');
      this._loadingScreen.updateProgress(0);

      // Загружаем все ресурсы через SceneManager
      await this._sceneManager.loadAll(
        this._modelUrl,
        (progress: number, stage: string) => {
          // Обновляем UI реальным прогрессом
          this._loadingScreen.updateProgress(progress);
          this._loadingScreen.setStatus(stage);
          
          // Логируем прогресс для отладки
          if (progress % 0.1 < 0.01) {
            console.log(`📊 Прогресс: ${Math.round(progress * 100)}% - ${stage}`);
          }
        }
      );
      
      // Скрываем экран загрузки с анимацией
      await this._loadingScreen.hide();
      
      // Запускаем анимацию камеры
      await this._sceneManager.showScene();
      
      console.log("🎉 Приложение полностью загружено и готово к использованию!");
      
    } catch (error) {
      console.error('❌ Критическая ошибка загрузки:', error);
      this._loadingScreen.hide();
      this._connectionScreen.showError('Не удалось загрузить ресурсы. Проверьте соединение.');
    }
  }
}

// Запускаем приложение
window.addEventListener('load', () => {
  new App();
});