import { Scene, StandardMaterial, PBRMaterial, Material, Mesh } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { BuildingElement } from "@shared/types";
import { WALL_CONFIG } from "@shared/constants";
import { IWallManager } from "@shared/interfaces";

@injectable()
export class WallManager implements IWallManager {
    private readonly logger: Logger;
    private readonly eventBus: EventBus;

    private walls: BuildingElement[] = [];
    private wallsByFloor: Map<number, BuildingElement[]> = new Map();
    private transparent: boolean = WALL_CONFIG.DEFAULT_TRANSPARENT;
    private readonly transparentAlpha: number = WALL_CONFIG.TRANSPARENT_ALPHA;
    private scene: Scene | null = null;
    private renderingGroupsSetup: boolean = false;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus
    ) {
        this.logger = logger.getLogger('WallManager');
        this.eventBus = eventBus;
    }

    public setScene(scene: Scene): void {
        this.scene = scene;
        this.setupRenderingGroups();
    }

    /**
     * Настройка rendering groups для правильного порядка отрисовки
     * Стены рисуются первыми (group 0), метки будут поверх (group 1)
     */
    private setupRenderingGroups(): void {
        if (!this.scene || this.renderingGroupsSetup) return;

        // Убеждаемся, что rendering groups существуют
        if (!this.scene.materials) return;

        this.renderingGroupsSetup = true;
        this.logger.debug("Rendering groups setup completed");
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

        // Сохраняем оригинальный материал и клонируем его
        if (element.mesh.material && !element.originalMaterial) {
            element.originalMaterial = element.mesh.material as any;
        }

        // Назначаем rendering group для стены
        this.assignWallRenderingGroup(element);
    }

    /**
     * Назначает rendering group для стены
     * Стены рендерятся в группе 0, чтобы метки (группа 1) были поверх
     */
    private assignWallRenderingGroup(element: BuildingElement): void {
        if (!element.mesh) return;

        // Назначаем rendering group для меша стены
        element.mesh.renderingGroupId = WALL_CONFIG.WALL_RENDERING_GROUP;

        // НЕ модифицируем оригинальный материал!
        // Настройки глубины применяются только к прозрачному материалу
    }

    /**
     * Обновляет параметры записи в depth buffer для материала
     */
    private updateMaterialDepthWrite(material: Material, writeDepth: boolean): void {
        if (material instanceof StandardMaterial) {
            material.disableDepthWrite = !writeDepth;
        } else if (material instanceof PBRMaterial) {
            material.disableDepthWrite = !writeDepth;
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

            if (this.transparent) {
                // Создаём прозрачную версию материала, если её ещё нет
                if (!wall.transparentMaterial) {
                    wall.transparentMaterial = this.createTransparentMaterial(wall);
                }

                // Применяем прозрачный материал
                wall.mesh.material = wall.transparentMaterial;
            } else {
                // Восстанавливаем оригинальный материал (не модифицируем его!)
                if (wall.originalMaterial) {
                    wall.mesh.material = wall.originalMaterial as any;
                }
            }
        });

        this.logger.debug(`Transparency applied: ${this.transparent ? 'ON' : 'OFF'} (alpha: ${alpha.toFixed(2)})`);
    }

    /**
     * Создаёт прозрачную версию материала из оригинального
     */
    private createTransparentMaterial(wall: BuildingElement): StandardMaterial | PBRMaterial {
        const original = wall.originalMaterial;
        if (!original) {
            return wall.mesh.material as StandardMaterial | PBRMaterial;
        }

        if (original instanceof StandardMaterial) {
            // Клонируем через Babylon.js метод clone()
            const transparentMat = original.clone(`${original.name}_transparent`) as StandardMaterial;

            // Применяем прозрачность
            transparentMat.alpha = this.transparentAlpha;
            transparentMat.transparencyMode = Material.MATERIAL_ALPHABLEND;
            transparentMat.disableDepthWrite = WALL_CONFIG.DISABLE_DEPTH_WRITE;
            transparentMat.needDepthPrePass = WALL_CONFIG.USE_DEPTH_PRE_PASS;
            transparentMat.backFaceCulling = false; // Отключаем для прозрачных стен

            // Уменьшаем насыщенность цвета для лучшей видимости меток
            if (transparentMat.diffuseColor) {
                const scaledColor = transparentMat.diffuseColor.clone().scale(WALL_CONFIG.TRANSPARENT_COLOR_SCALE);
                transparentMat.diffuseColor = scaledColor;
            }

            // Добавляем лёгкий emissive для видимости геометрии
            if (transparentMat.diffuseColor) {
                transparentMat.emissiveColor = transparentMat.diffuseColor.scale(0.15);
            }

            return transparentMat;
        } else if (original instanceof PBRMaterial) {
            // Клонируем через Babylon.js метод clone()
            const transparentMat = original.clone(`${original.name}_transparent`) as PBRMaterial;

            // Применяем прозрачность
            transparentMat.alpha = this.transparentAlpha;
            transparentMat.transparencyMode = Material.MATERIAL_ALPHABLEND;
            transparentMat.disableDepthWrite = WALL_CONFIG.DISABLE_DEPTH_WRITE;
            transparentMat.needDepthPrePass = WALL_CONFIG.USE_DEPTH_PRE_PASS;
            transparentMat.backFaceCulling = false; // Отключаем для прозрачных стен

            // Уменьшаем насыщенность цвета для лучшей видимости меток
            if (transparentMat.albedoColor) {
                transparentMat.albedoColor = transparentMat.albedoColor.scale(WALL_CONFIG.TRANSPARENT_COLOR_SCALE);
            }

            return transparentMat;
        }

        return wall.mesh.material as StandardMaterial | PBRMaterial;
    }

    public get count(): number {
        return this.walls.length;
    }

    public get isTransparent(): boolean {
        return this.transparent;
    }

    /**
     * Назначает rendering group для маркера, чтобы он отображался поверх стен
     * Вызывается из MarkerManager при создании маркера
     */
    public assignMarkerRenderingGroup(mesh: Mesh): void {
        if (!mesh) return;

        // Назначаем маркер в более высокую rendering group
        mesh.renderingGroupId = WALL_CONFIG.MARKER_RENDERING_GROUP;

        // Убедимся, что материал маркера пишет в depth buffer
        const material = mesh.material;
        if (material) {
            this.updateMaterialDepthWrite(material, true);
        }
    }
}