import { Scene, MeshBuilder, Color3, Vector3, TransformNode, LinesMesh } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { GRID } from "../../shared/constants";
import { IGridManager } from "@shared/interfaces";

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
        this.logger.debug("Scene set");
    }

    public async load(onProgress?: (progress: number) => void): Promise<void> {
        this.logger.debug("Loading grid manager");
        
        if (!this.scene) {
            throw new Error("Scene not set");
        }
        
        onProgress?.(0.2);
        this.createGrid();
        onProgress?.(0.8);
        this.setOpacity(this.opacity);
        this.setVisible(this.visible);
        onProgress?.(1.0);
        
        this.logger.info(`Grid manager loaded, lines: ${this.gridLines.length}`);
    }

    public async initialize(): Promise<void> {
        this.logger.debug("Initializing grid manager");
        if (this.isInitialized) return;
        
        this.isInitialized = true;
        this.logger.info("Grid manager initialized");
    }

    public update(_deltaTime: number): void {}

    private createGrid(): void {
        this.clearGrid();
        
        const range = this.currentSize;
        
        // Вспомогательные линии
        for (let i = -range; i <= range; i += this.secondaryStep) {
            if (Math.abs(i % this.mainStep) < 0.001) continue;
            
            this.createGridLine(
                new Vector3(i, 0, -range),
                new Vector3(i, 0, range),
                this.secondaryColor,
                0.3
            );
            this.createGridLine(
                new Vector3(-range, 0, i),
                new Vector3(range, 0, i),
                this.secondaryColor,
                0.3
            );
        }
        
        // Основные линии
        for (let i = -range; i <= range; i += this.mainStep) {
            if (Math.abs(i) < 0.001) continue;
            
            this.createGridLine(
                new Vector3(i, 0, -range),
                new Vector3(i, 0, range),
                this.mainColor,
                0.8
            );
            this.createGridLine(
                new Vector3(-range, 0, i),
                new Vector3(range, 0, i),
                this.mainColor,
                0.8
            );
        }
        
        // Оси
        this.createGridLine(
            new Vector3(-range, 0, 0),
            new Vector3(range, 0, 0),
            this.axisXColor,
            2.0
        );
        this.createGridLine(
            new Vector3(0, 0, -range),
            new Vector3(0, 0, range),
            this.axisZColor,
            2.0
        );
        
        this.logger.debug(`Grid created with size: ${range}, lines: ${this.gridLines.length}`);
    }

    private createGridLine(start: Vector3, end: Vector3, color: Color3, thickness: number): void {
        const lines = MeshBuilder.CreateLines(
            `gridLine_${start.x}_${start.z}`,
            { points: [start, end] },
            this.scene
        );
        lines.color = color.clone();
        lines.parent = this.gridNode;
        lines.position.y = 0.01;
        lines.metadata = { originalColor: color.clone(), thickness };
        this.gridLines.push(lines);
    }

    private clearGrid(): void {
        this.gridLines.forEach(line => line.dispose());
        this.gridLines = [];
    }

    private updateColors(): void {
        this.gridLines.forEach(line => {
            if (line.metadata?.originalColor) {
                const orig = line.metadata.originalColor;
                line.color = new Color3(orig.r * this.opacity, orig.g * this.opacity, orig.b * this.opacity);
            }
        });
    }

    public setOpacity(opacity: number): void {
        this.opacity = Math.max(0, Math.min(1, opacity));
        this.updateColors();
    }

    public setVisible(visible: boolean): void {
        this.visible = visible;
        this.gridLines.forEach(line => line.setEnabled(visible));
    }

    public setSize(size: number): void {
        this.currentSize = Math.max(10, Math.min(200, size));
        if (this.isInitialized) {
            this.refresh();
        }
    }

    public setColor(mainColor: Color3, secondaryColor: Color3): void {
        this.mainColor = mainColor;
        this.secondaryColor = secondaryColor;
        if (this.isInitialized) {
            this.refresh();
        }
    }

    public refresh(): void {
        if (!this.isInitialized) return;
        this.clearGrid();
        this.createGrid();
        this.setOpacity(this.opacity);
        this.setVisible(this.visible);
        this.logger.debug(`Grid refreshed with size: ${this.currentSize}`);
    }

    public dispose(): void {
        this.clearGrid();
        if (this.gridNode) {
            this.gridNode.dispose();
        }
        this.logger.info("GridManager disposed");
    }
}