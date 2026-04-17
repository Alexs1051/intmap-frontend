import { Engine, EngineOptions } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { ConfigService } from "@core/config/config-service";

@injectable()
export class BabylonEngine {
  private engine: Engine;
  private canvas: HTMLCanvasElement;
  private logger: Logger;
  private isDisposed: boolean = false;
  private resizeTimeouts: number[] = [];

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.ConfigService) configService: ConfigService
  ) {
    this.logger = logger.getLogger('BabylonEngine');

    const fullConfig = configService.get();
    const engineConfig = fullConfig.engine;

    this.canvas = this.createCanvas(engineConfig.canvasId);

    const engineOptions: EngineOptions = {
      antialias: engineConfig.antialias ?? true,
      adaptToDeviceRatio: engineConfig.adaptToDeviceRatio ?? true
    };

    this.engine = new Engine(this.canvas, true, engineOptions);
    this.setupEventHandlers();

    this.logger.info("BabylonEngine initialized");
  }

  private createCanvas(canvasId?: string): HTMLCanvasElement {
    let canvas: HTMLCanvasElement | null = null;

    if (canvasId) {
      canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    }

    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.id = canvasId || "gameCanvas";
      document.body.appendChild(canvas);
    }

    return canvas;
  }

  private setupEventHandlers(): void {
    window.addEventListener("resize", () => this.scheduleResize());
    window.addEventListener("orientationchange", () => this.scheduleResize([0, 100, 250, 500]));
    window.visualViewport?.addEventListener("resize", () => this.scheduleResize([0, 100, 250]));

    this.canvas.addEventListener("webglcontextlost", (event) => {
      this.logger.warn("WebGL context lost");
      event.preventDefault();
    });

    this.canvas.addEventListener("webglcontextrestored", () => {
      this.logger.info("WebGL context restored");
    });
  }

  private scheduleResize(delays: number[] = [0, 80, 180]): void {
    if (this.isDisposed) {
      return;
    }

    this.resizeTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    this.resizeTimeouts = [];

    const resize = () => {
      if (this.isDisposed) {
        return;
      }

      this.canvas.style.width = `${window.innerWidth}px`;
      this.canvas.style.height = `${window.innerHeight}px`;
      this.engine.resize();
    };

    delays.forEach((delay) => {
      const timeoutId = window.setTimeout(resize, delay);
      this.resizeTimeouts.push(timeoutId);
    });
  }

  public runRenderLoop(callback: () => void): void {
    this.engine.runRenderLoop(callback);
    this.logger.debug("Render loop started");
  }

  public stopRenderLoop(): void {
    this.engine.stopRenderLoop();
    this.logger.debug("Render loop stopped");
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public isEngineDisposed(): boolean {
    return this.isDisposed;
  }

  public dispose(): void {
    if (this.isDisposed) return;

    this.resizeTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    this.resizeTimeouts = [];
    this.stopRenderLoop();
    this.engine.dispose();
    this.isDisposed = true;

    this.logger.info("BabylonEngine disposed");
  }
}
