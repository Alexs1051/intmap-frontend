import { Scene, SceneLoader, AbstractMesh } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { EventBus } from "../../core/events/EventBus";
import { EventType } from "../../core/events/EventTypes";
import { IBuildingLoader } from "@shared/interfaces";

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
    ): Promise<{ meshes: AbstractMesh[]; rootMesh: AbstractMesh | null }> {
        if (!this.scene) throw new Error("Scene not set before load");

        this.logger.info(`Loading model: ${modelUrl}`);
        this.eventBus.emit(EventType.LOADING_START, { url: modelUrl, type: 'building' });

        try {
            const result = await SceneLoader.ImportMeshAsync(
                "", "", modelUrl, this.scene,
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

            this.logger.info(`Model loaded, meshes: ${result.meshes.length}`);

            const rootMesh = result.meshes.find(mesh =>
                ["__root__", "root", "scene"].includes(mesh.name)
            ) || null;

            this.eventBus.emit(EventType.BUILDING_LOADED, { meshes: result.meshes.length });
            return { meshes: result.meshes, rootMesh };
        } catch (error) {
            this.logger.error("Failed to load model", error);
            this.eventBus.emit(EventType.LOADING_ERROR, { error });
            throw error;
        }
    }

    public unloadModel(): void {
        if (!this.scene) return;

        const meshesToRemove = this.scene.meshes.filter(mesh =>
            mesh.name.startsWith("SM_") ||
            mesh.name.includes("building") ||
            mesh.name.includes("Floor") ||
            mesh.name.startsWith("__root__")
        );

        meshesToRemove.forEach(mesh => mesh.dispose());
        this.logger.info(`Unloaded ${meshesToRemove.length} meshes`);
    }
}