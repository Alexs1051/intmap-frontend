import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, TransformNode, LinesMesh } from "@babylonjs/core";
import { GRID_SIZE, GRID_COLOR_MAIN, GRID_COLOR_SECONDARY } from "../../shared/constants";

export class GridManager {
  private static _instance: GridManager;
  private _scene: Scene;
  private _gridNode: TransformNode;
  private _gridLines: LinesMesh[] = [];

  private constructor(scene: Scene) {
    this._scene = scene;
    this._gridNode = new TransformNode("gridNode", scene);
    this.createInfiniteGrid();
  }

  public static getInstance(scene: Scene): GridManager {
    if (!GridManager._instance) {
      GridManager._instance = new GridManager(scene);
    }
    return GridManager._instance;
  }

  /**
   * Создаёт сетку как в Blender с прозрачным фоном
   */
  private createInfiniteGrid(): void {
    const axisXColor = new Color3(1, 0.3, 0.3); // Мягкий красный для X
    const axisZColor = new Color3(0.3, 0.3, 1); // Мягкий синий для Z
    const range = GRID_SIZE;
    const mainStep = 5; // Основной шаг
    const secondaryStep = 1; // Второстепенный шаг

    // Сначала создаём второстепенные линии (более тусклые)
    for (let i = -range; i <= range; i += secondaryStep) {
      const isMainLine = i % mainStep === 0;
      
      // Пропускаем главные линии сейчас, добавим их позже
      if (isMainLine) continue;

      // Линии по Z (вертикальные)
      this.createGridLine(
        new Vector3(i, 0, -range),
        new Vector3(i, 0, range),
        GRID_COLOR_SECONDARY,
        0.3 // Тоньше для второстепенных
      );

      // Линии по X (горизонтальные)
      this.createGridLine(
        new Vector3(-range, 0, i),
        new Vector3(range, 0, i),
        GRID_COLOR_SECONDARY,
        0.3
      );
    }

    // Затем создаём главные линии (ярче)
    for (let i = -range; i <= range; i += mainStep) {
      if (i === 0) continue; // Пропускаем центр, добавим отдельно

      // Главные линии по Z
      this.createGridLine(
        new Vector3(i, 0, -range),
        new Vector3(i, 0, range),
        GRID_COLOR_MAIN,
        0.8
      );

      // Главные линии по X
      this.createGridLine(
        new Vector3(-range, 0, i),
        new Vector3(range, 0, i),
        GRID_COLOR_MAIN,
        0.8
      );
    }

    // Добавляем выделенные оси (самые яркие)
    this.createGridLine(
      new Vector3(-range, 0, 0), 
      new Vector3(range, 0, 0), 
      axisXColor, 
      2.0
    ); // Ось X
    
    this.createGridLine(
      new Vector3(0, 0, -range), 
      new Vector3(0, 0, range), 
      axisZColor, 
      2.0
    ); // Ось Z
  }

  private createGridLine(start: Vector3, end: Vector3, color: Color3, thickness: number = 1.0): void {
    const lines = MeshBuilder.CreateLines("gridLine", {
      points: [start, end],
      updatable: false,
      instance: null
    }, this._scene);
    
    lines.color = color.clone();
    lines.parent = this._gridNode;
    
    // Делаем линии чуть приподнятыми, чтобы избежать z-fighting
    lines.position.y = 0.01;
    
    // ИСПОЛЬЗУЕМ METADATA вместо userData
    lines.metadata = {
      originalColor: color.clone()
    };
    
    // Сохраняем ссылку на линию (может пригодиться)
    this._gridLines.push(lines);
  }

  /**
   * Обновить прозрачность сетки
   */
  public setOpacity(opacity: number): void {
    this._gridLines.forEach(line => {
      if (line.color && line.metadata?.originalColor) {
        // Достаём оригинальный цвет из metadata
        const original = line.metadata.originalColor;
        
        // Меняем яркость в зависимости от opacity
        line.color = new Color3(
          original.r * opacity,
          original.g * opacity,
          original.b * opacity
        );
      }
    });
  }
}