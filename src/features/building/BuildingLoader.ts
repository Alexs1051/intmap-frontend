import { Scene, SceneLoader, AbstractMesh } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { logger } from "../../core/logger/Logger";

const loaderLogger = logger.getLogger('BuildingLoader');

export interface LoadResult {
  meshes: AbstractMesh[];
  rootMesh: AbstractMesh | null;
}

export class BuildingLoader {
  constructor(private readonly _scene: Scene) {}

  public async loadModel(
    modelUrl: string, 
    onProgress?: (progress: number) => void
  ): Promise<LoadResult> {
    try {
      loaderLogger.info(`Загрузка модели: ${modelUrl}`);
      
      const result = await SceneLoader.ImportMeshAsync(
        "",
        "",
        modelUrl,
        this._scene,
        (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(event.loaded / event.total);
          }
        },
        ".glb"
      );

      loaderLogger.info(`Модель загружена. Мешей: ${result.meshes.length}`);

      const rootMesh = result.meshes.find(mesh => 
        ["__root__", "root", "scene"].includes(mesh.name)
      ) || null;

      return { meshes: result.meshes, rootMesh };
    } catch (error) {
      loaderLogger.error("Ошибка загрузки модели", error);
      throw error;
    }
  }

  public unloadModel(): void {
    const meshesToRemove = this._scene.meshes.filter(mesh => 
      mesh.name.startsWith("SM_") || 
      mesh.name.includes("building") ||
      mesh.name.includes("Floor")
    );
    
    meshesToRemove.forEach(mesh => mesh.dispose());
    loaderLogger.info(`Очищено ${meshesToRemove.length} мешей`);
  }
}