import { Scene, MeshBuilder, Color3, Vector3, TransformNode, LinesMesh } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { GRID } from "../../shared/constants";
import { IGridManager } from "@shared/interfaces";

/**
 * Менеджер сетки
 * Отрисовывает опорную сетку на полу здания для визуального ориентира
 */
@injectable()
export class GridManager implements IGridManager {
    private scene!: Scene;
    private logger: Logger;

    private gridNode!: TransformNode;
    private gridLines: LinesMesh[] = [];
    private isInitialized: boolean = false;
    private visible: boolean = true;
    private opacity: number = GRID.DEFAULT_OPACITY;
    private currentSize: number = GRID.SIZE;

    private mainStep: number = GRID.MAIN_STEP;
    private secondaryStep: number = GRID.SECONDARY_STEP;
    private mainColor: Color3 = GRID.MAIN_COLOR;
    private secondaryColor: Color3 = GRID.SECONDARY_COLOR;
    private axisXColor: Color3 = GRID.AXIS_X_COLOR;
    private axisZColor: Color3 = GRID.AXIS_Z_COLOR;

    constructor(@inject(TYPES.Logger) logger: Logger) {
        this.logger = logger.getLogger('GridManager');
    }

    public setScene(scene: Scene): void {
        this.scene = scene;
        this.gridNode = new TransformNode("gridNode", scene);
    }

    public async load(onProgress?: (progress: number) => void): Promise<void> {
        if (!this.scene) {
            throw new Error("Scene not set");
        }

        onProgress?.(0.2);
        this.createGrid();
        onProgress?.(0.8);
        this.setOpacity(this.opacity);
        this.setVisible(this.visible);
        onProgress?.(1.0);

        this.logger.info(`Grid loaded: ${this.gridLines.length} lines`);
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.logger.info("Grid initialized");
    }

    public update(_deltaTime: number): void { }

    /**
     * Создать сетку из линий
     */
    private createGrid(): void {
        this.clearGrid();

        const range = this.currentSize;

        this.createSecondaryLines(range);
        this.createMainLines(range);
        this.createAxes(range);
    }

    /**
     * Создать второстепенные линии
     */
    private createSecondaryLines(range: number): void {
        for (let i = -range; i <= range; i += this.secondaryStep) {
            // Пропускаем основные линии
            if (Math.abs(i % this.mainStep) < 0.001) continue;

            this.addLine(
                new Vector3(i, 0, -range),
                new Vector3(i, 0, range),
                this.secondaryColor,
                GRID.SECONDARY_THICKNESS
            );
            this.addLine(
                new Vector3(-range, 0, i),
                new Vector3(range, 0, i),
                this.secondaryColor,
                GRID.SECONDARY_THICKNESS
            );
        }
    }

    /**
     * Создать основные линии
     */
    private createMainLines(range: number): void {
        for (let i = -range; i <= range; i += this.mainStep) {
            // Пропускаем центр
            if (Math.abs(i) < 0.001) continue;

            this.addLine(
                new Vector3(i, 0, -range),
                new Vector3(i, 0, range),
                this.mainColor,
                GRID.MAIN_THICKNESS
            );
            this.addLine(
                new Vector3(-range, 0, i),
                new Vector3(range, 0, i),
                this.mainColor,
                GRID.MAIN_THICKNESS
            );
        }
    }

    /**
     * Создать оси координат
     */
    private createAxes(range: number): void {
        this.addLine(
            new Vector3(-range, 0, 0),
            new Vector3(range, 0, 0),
            this.axisXColor,
            GRID.AXIS_THICKNESS
        );
        this.addLine(
            new Vector3(0, 0, -range),
            new Vector3(0, 0, range),
            this.axisZColor,
            GRID.AXIS_THICKNESS
        );
    }

    /**
     * Добавить линию сетки
     */
    private addLine(start: Vector3, end: Vector3, color: Color3, _thickness: number): void {
        const lines = MeshBuilder.CreateLines(
            `grid_${start.x.toFixed(0)}_${start.z.toFixed(0)}`,
            { points: [start, end] },
            this.scene
        );
        lines.color = color.clone();
        lines.parent = this.gridNode;
        lines.position.y = GRID.OFFSET_Y;
        lines.metadata = { originalColor: color.clone() };
        this.gridLines.push(lines);
    }

    /**
     * Очистить все линии
     */
    private clearGrid(): void {
        this.gridLines.forEach(line => line.dispose());
        this.gridLines = [];
    }

    /**
     * Обновить цвета линий с учётом прозрачности
     */
    private updateColors(): void {
        this.gridLines.forEach(line => {
            const orig = line.metadata?.originalColor;
            if (orig) {
                line.color = new Color3(
                    orig.r * this.opacity,
                    orig.g * this.opacity,
                    orig.b * this.opacity
                );
            }
        });
    }

    /**
     * Установить прозрачность (0-1)
     */
    public setOpacity(opacity: number): void {
        this.opacity = Math.max(0, Math.min(1, opacity));
        this.updateColors();
    }

    /**
     * Показать/скрыть сетку
     */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        this.gridLines.forEach(line => line.setEnabled(visible));
    }

    /**
     * Установить размер сетки (10-200)
     */
    public setSize(size: number): void {
        this.currentSize = Math.max(GRID.MIN_SIZE, Math.min(GRID.MAX_SIZE, size));
        if (this.isInitialized) {
            this.refresh();
        }
    }

    /**
     * Установить цвета основных и второстепенных линий
     */
    public setColor(mainColor: Color3, secondaryColor: Color3): void {
        this.mainColor = mainColor;
        this.secondaryColor = secondaryColor;
        if (this.isInitialized) {
            this.refresh();
        }
    }

    /**
     * Пересоздать сетку с текущими настройками
     */
    public refresh(): void {
        if (!this.isInitialized) return;
        this.clearGrid();
        this.createGrid();
        this.setOpacity(this.opacity);
        this.setVisible(this.visible);
    }

    public dispose(): void {
        this.clearGrid();
        this.gridNode?.dispose();
        this.logger.info("GridManager disposed");
    }
}