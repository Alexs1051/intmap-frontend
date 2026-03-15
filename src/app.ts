import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { BabylonEngine } from "./core/engine/BabylonEngine";
import { SceneManager } from "./core/scene/SceneManager";

class App {
  private _engine: BabylonEngine;
  private _sceneManager: SceneManager;

  constructor() {
    // Инициализируем движок
    this._engine = BabylonEngine.getInstance();
    
    // Инициализируем сцену
    this._sceneManager = SceneManager.getInstance();

    // Загружаем здание и запускаем анимацию камеры
    this._sceneManager.loadBuilding("/models/building.glb").then(() => {
      console.log("🚀 Приложение запущено");
    });

    // Запускаем рендер-цикл
    this._engine.runRenderLoop(() => {
      this._sceneManager.render();
    });

    // Инспектор для отладки (Ctrl+Shift+Alt+I)
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
}

// Запускаем приложение после загрузки страницы
window.addEventListener("load", () => {
  new App();
});