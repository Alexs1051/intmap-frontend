import { Scene, SceneLoader, AbstractMesh, TransformNode } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { apiFetch } from "@core/api/api-client";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
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
    private readonly objectUrls: string[] = [];

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
        modelUrl: string | string[],
        onProgress?: (progress: number) => void
    ): Promise<LoadResult> {
        if (!this.scene) {
            throw new Error("Scene not set before load");
        }

        const modelUrls = Array.isArray(modelUrl) ? modelUrl : [modelUrl];
        this.logger.info(`Loading model assets from: ${modelUrls.join(', ')}`);
        this.eventBus.emit(EventType.LOADING_START, { url: modelUrls, type: 'building' });

        try {
            const allMeshes: AbstractMesh[] = [];
            const allTransformNodes: TransformNode[] = [];
            let rootMesh: AbstractMesh | null = null;

            for (let index = 0; index < modelUrls.length; index++) {
                const assetUrl = modelUrls[index];
                if (!assetUrl) {
                    continue;
                }
                const baseProgress = index / modelUrls.length;
                const weight = 1 / modelUrls.length;
                const resolvedAssetUrl = await this.resolveAssetUrl(assetUrl);

                const result = await SceneLoader.ImportMeshAsync(
                    "",
                    "",
                    resolvedAssetUrl,
                    this.scene,
                    (event) => {
                        if (event.lengthComputable && onProgress) {
                            const assetProgress = event.total > 0 ? event.loaded / event.total : 0;
                            const overallProgress = baseProgress + (assetProgress * weight);
                            onProgress(overallProgress);
                            this.eventBus.emit(EventType.LOADING_PROGRESS, {
                                component: 'building',
                                progress: overallProgress
                            });
                        }
                    },
                    ".glb"
                );

                allMeshes.push(...result.meshes);
                allTransformNodes.push(...(result.transformNodes || []));

                if (!rootMesh) {
                    rootMesh = result.meshes.find(mesh =>
                        ["__root__", "root", "scene"].includes(mesh.name)
                    ) || null;
                }

                if (onProgress) {
                    onProgress((index + 1) / modelUrls.length);
                }
            }
            this.logger.info(`Model assets loaded: ${allMeshes.length} meshes, ${allTransformNodes.length} transform nodes`);

            this.eventBus.emit(EventType.BUILDING_LOADED, { meshes: allMeshes.length });

            return {
                meshes: allMeshes,
                transformNodes: allTransformNodes,
                rootMesh
            };
        } catch (error) {
            this.logger.error("Failed to load model", error);
            this.eventBus.emit(EventType.LOADING_ERROR, { error });
            throw error;
        }
    }

    private async resolveAssetUrl(assetUrl: string): Promise<string> {
        if (!this.requiresAuthenticatedFetch(assetUrl)) {
            return assetUrl;
        }

        const response = await apiFetch(assetUrl, {
            method: 'GET',
            headers: {
                Accept: 'model/gltf-binary, application/octet-stream'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch protected asset: ${response.status}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        this.objectUrls.push(objectUrl);
        return objectUrl;
    }

    private requiresAuthenticatedFetch(assetUrl: string): boolean {
        return assetUrl.includes('/api/v1/buildings/') && assetUrl.includes('/file');
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
        this.disposeObjectUrls();
        this.logger.info(`Unloaded ${meshesToRemove.length} meshes`);
    }

    private disposeObjectUrls(): void {
        while (this.objectUrls.length > 0) {
            const url = this.objectUrls.pop();
            if (url) {
                URL.revokeObjectURL(url);
            }
        }
    }
}
