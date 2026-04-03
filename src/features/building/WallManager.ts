import { Scene, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { EventBus } from "../../core/events/EventBus";
import { EventType } from "../../core/events/EventTypes";
import { BuildingElement } from "../../shared/types";
import { WALL_CONFIG } from "../../shared/constants";
import { IWallManager } from "@shared/interfaces";

@injectable()
export class WallManager implements IWallManager {
    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    
    private walls: BuildingElement[] = [];
    private wallsByFloor: Map<number, BuildingElement[]> = new Map();
    private transparent: boolean = WALL_CONFIG.DEFAULT_TRANSPARENT;
    private readonly transparentAlpha: number = WALL_CONFIG.TRANSPARENT_ALPHA;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus
    ) {
        this.logger = logger.getLogger('WallManager');
        this.eventBus = eventBus;
    }

    public setScene(_scene: Scene): void {
    }

    public async initialize(): Promise<void> {
        this.logger.debug("WallManager initialized");
    }

    public update(_deltaTime: number): void {
        // Не требует обновления
    }

    public dispose(): void {
        this.walls = [];
        this.wallsByFloor.clear();
        this.logger.info("WallManager disposed");
    }

    public addWall(element: BuildingElement): void {
        this.walls.push(element);

        if (element.floorNumber) {
            const walls = this.wallsByFloor.get(element.floorNumber) || [];
            walls.push(element);
            this.wallsByFloor.set(element.floorNumber, walls);
        }

        if (element.mesh.material && !element.originalMaterial) {
            element.originalMaterial = element.mesh.material as any;
        }
    }

    public showWallsForFloor(floorNumber: number): void {
        this.hideAllWalls();

        const walls = this.wallsByFloor.get(floorNumber);
        walls?.forEach(wall => {
            wall.mesh.isVisible = true;
            wall.isVisible = true;
        });

        this.applyTransparency();
    }

    public showAllWalls(): void {
        this.walls.forEach(wall => {
            wall.mesh.isVisible = true;
            wall.isVisible = true;
        });
        this.applyTransparency();
    }

    public hideAllWalls(): void {
        this.walls.forEach(wall => {
            wall.mesh.isVisible = false;
            wall.isVisible = false;
        });
    }

    public toggleTransparency(): void {
        this.transparent = !this.transparent;
        this.applyTransparency();
        this.eventBus.emit(EventType.WALL_TRANSPARENCY_TOGGLED, { transparent: this.transparent });
    }

    public setTransparency(transparent: boolean): void {
        if (this.transparent !== transparent) {
            this.transparent = transparent;
            this.applyTransparency();
        }
    }

    private applyTransparency(): void {
        const alpha = this.transparent ? this.transparentAlpha : 1.0;

        this.walls.forEach(wall => {
            if (!wall.mesh.isVisible) return;
            
            const material = wall.mesh.material;
            if (!material) return;

            if (material instanceof StandardMaterial) {
                material.alpha = alpha;
                material.transparencyMode = this.transparent 
                    ? Material.MATERIAL_ALPHABLEND 
                    : Material.MATERIAL_OPAQUE;
                
                if (!this.transparent && wall.originalMaterial instanceof StandardMaterial) {
                    material.diffuseColor = wall.originalMaterial.diffuseColor.clone();
                } else if (this.transparent) {
                    const color = material.diffuseColor.clone();
                    material.diffuseColor = color.scale(0.8);
                }
            } else if (material instanceof PBRMaterial) {
                material.alpha = alpha;
                material.transparencyMode = this.transparent 
                    ? Material.MATERIAL_ALPHABLEND 
                    : Material.MATERIAL_OPAQUE;
            }
            
            material.backFaceCulling = !this.transparent;
        });
    }

    public get count(): number {
        return this.walls.length;
    }

    public get isTransparent(): boolean {
        return this.transparent;
    }
}