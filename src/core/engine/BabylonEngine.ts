import { Engine } from "@babylonjs/core";
import { logger } from "../logger/Logger";

const engineLogger = logger.getLogger('BabylonEngine');

export class BabylonEngine {
  private static _instance: BabylonEngine;
  private _engine: Engine;
  private _canvas: HTMLCanvasElement;

  private constructor() {
    this._canvas = document.createElement("canvas");
    this._canvas.style.width = "100%";
    this._canvas.style.height = "100%";
    this._canvas.id = "gameCanvas";
    document.body.appendChild(this._canvas);

    this._engine = new Engine(this._canvas, true);
    
    window.addEventListener("resize", () => this._engine.resize());
    
    engineLogger.info("BabylonEngine инициализирован");
  }

  public static getInstance(): BabylonEngine {
    if (!BabylonEngine._instance) {
      BabylonEngine._instance = new BabylonEngine();
    }
    return BabylonEngine._instance;
  }

  public get engine(): Engine {
    return this._engine;
  }

  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  public runRenderLoop(callback: () => void): void {
    this._engine.runRenderLoop(callback);
  }
}