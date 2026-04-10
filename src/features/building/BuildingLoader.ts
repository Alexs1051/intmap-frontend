import { Scene, SceneLoader, AbstractMesh, TransformNode } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { EventBus } from "../../core/events/EventBus";
import { EventType } from "../../core/events/EventTypes";
import { IBuildingLoader } from "@shared/interfaces";

export interface LoadResult {
    meshes: AbstractMesh[];
    transformNodes: TransformNode[];
    rootMesh: AbstractMesh | null;
}

@injectable()
export class BuildingLoader implements IBuildingLoader {
    private logger: Logger;
    private scene?: Scene;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.logger = logger.getLogger('BuildingLoader');
    }

    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    public async loadModel(
        modelUrl: string,
        onProgress?: (progress: number) => void
    ): Promise<LoadResult> {
        if (!this.scene) {
            throw new Error("Scene not set before load");
        }

        this.logger.info(`Loading model from: ${modelUrl}`);
        this.eventBus.emit(EventType.LOADING_START, { url: modelUrl, type: 'building' });

        try {
            const result = await SceneLoader.ImportMeshAsync(
                "",
                "",
                modelUrl,
                this.scene,
                (event) => {
                    if (event.lengthComputable && onProgress) {
                        onProgress(event.loaded / event.total);
                        this.eventBus.emit(EventType.LOADING_PROGRESS, {
                            component: 'building',
                            progress: event.loaded / event.total
                        });
                    }
                },
                ".glb"
            );

            const transformNodes = result.transformNodes || [];

            this.logger.info(`Model loaded: ${result.meshes.length} meshes, ${transformNodes.length} transform nodes`);

            const rootMesh = result.meshes.find(mesh =>
                ["__root__", "root", "scene"].includes(mesh.name)
            ) || null;

            this.eventBus.emit(EventType.BUILDING_LOADED, { meshes: result.meshes.length });

            return {
                meshes: result.meshes,
                transformNodes: transformNodes,
                rootMesh
            };
        } catch (error) {
            this.logger.error("Failed to load model", error);
            this.eventBus.emit(EventType.LOADING_ERROR, { error });
            throw error;
        }
    }

    public unloadModel(): void {
        if (!this.scene) return;

        const meshesToRemove = this.scene.meshes.filter(mesh =>
            mesh.name.startsWith("Floor_") ||
            mesh.name.startsWith("Wall_") ||
            mesh.name.startsWith("Window_") ||
            mesh.name.startsWith("Door_") ||
            mesh.name.startsWith("Stair_") ||
            mesh.name.startsWith("Room_") ||
            mesh.name.startsWith("MR_") ||
            mesh.name.startsWith("FL_") ||
            mesh.name.startsWith("WP_") ||
            mesh.name === "Connections" ||
            mesh.name.startsWith("__root__")
        );

        meshesToRemove.forEach(mesh => mesh.dispose());
        this.logger.info(`Unloaded ${meshesToRemove.length} meshes`);
    }
}