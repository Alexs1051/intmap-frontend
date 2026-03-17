import { Scene, MeshBuilder, Color3, Vector3, TransformNode, LinesMesh } from "@babylonjs/core";
import { GRID_SIZE, GRID_COLOR_MAIN, GRID_COLOR_SECONDARY } from "../../shared/constants";
import { logger } from "../../core/logger/Logger";

const gridLogger = logger.getLogger('GridManager');

export class GridManager {
  private static _instance: GridManager;
  private _scene: Scene;
  private _gridNode: TransformNode;
  private _gridLines: LinesMesh[] = [];
  private _isInitialized: boolean = false;

  private constructor(scene: Scene) {
    this._scene = scene;
    this._gridNode = new TransformNode("gridNode", scene);
  }

  public static getInstance(scene: Scene): GridManager {
    if (!GridManager._instance) {
      GridManager._instance = new GridManager(scene);
    }
    return GridManager._instance;
  }

  public async initialize(onProgress?: (progress: number) => void): Promise<void> {
    gridLogger.debug("Инициализация сетки");
    
    onProgress?.(0.1);
    onProgress?.(0.3);
    this.createInfiniteGrid();
    
    onProgress?.(0.8);
    onProgress?.(0.9);
    this._isInitialized = true;
    onProgress?.(1.0);
    
    gridLogger.info(`Сетка инициализирована, линий: ${this._gridLines.length}`);
  }

  private createInfiniteGrid(): void {
    const axisXColor = new Color3(1, 0.3, 0.3);
    const axisZColor = new Color3(0.3, 0.3, 1);
    const range = GRID_SIZE;
    const mainStep = 5;
    const secondaryStep = 1;

    for (let i = -range; i <= range; i += secondaryStep) {
      if (i % mainStep === 0) continue;

      this.createGridLine(new Vector3(i, 0, -range), new Vector3(i, 0, range), GRID_COLOR_SECONDARY, 0.3);
      this.createGridLine(new Vector3(-range, 0, i), new Vector3(range, 0, i), GRID_COLOR_SECONDARY, 0.3);
    }

    for (let i = -range; i <= range; i += mainStep) {
      if (i === 0) continue;

      this.createGridLine(new Vector3(i, 0, -range), new Vector3(i, 0, range), GRID_COLOR_MAIN, 0.8);
      this.createGridLine(new Vector3(-range, 0, i), new Vector3(range, 0, i), GRID_COLOR_MAIN, 0.8);
    }

    this.createGridLine(new Vector3(-range, 0, 0), new Vector3(range, 0, 0), axisXColor, 2.0);
    this.createGridLine(new Vector3(0, 0, -range), new Vector3(0, 0, range), axisZColor, 2.0);
  }

  private createGridLine(start: Vector3, end: Vector3, color: Color3, thickness: number = 1.0): void {
    const lines = MeshBuilder.CreateLines("gridLine", { points: [start, end] }, this._scene);
    lines.color = color.clone();
    lines.parent = this._gridNode;
    lines.position.y = 0.01;
    lines.metadata = { originalColor: color.clone(), thickness };
    this._gridLines.push(lines);
  }

  public setOpacity(opacity: number): void {
    this._gridLines.forEach(line => {
      if (line.color && line.metadata?.originalColor) {
        const orig = line.metadata.originalColor;
        line.color = new Color3(orig.r * opacity, orig.g * opacity, orig.b * opacity);
      }
    });
  }

  public setVisible(visible: boolean): void {
    this._gridLines.forEach(line => line.setEnabled(visible));
  }

  public update(_deltaTime: number): void {}

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get gridNode(): TransformNode {
    return this._gridNode;
  }

  public get gridLines(): LinesMesh[] {
    return this._gridLines;
  }
}