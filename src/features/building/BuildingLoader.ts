import { Scene, SceneLoader, AbstractMesh } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

export interface LoadResult {
  meshes: AbstractMesh[];
  rootMesh: AbstractMesh | null;
}

export class BuildingLoader {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  /**
   * Загрузка модели из файла
   */
  public async loadModel(modelUrl: string): Promise<LoadResult> {
    try {
      console.log(`📦 Загрузка модели: ${modelUrl}`);
      
      const result = await SceneLoader.ImportMeshAsync(
        "",
        "",
        modelUrl,
        this._scene,
        undefined,
        ".glb"
      );

      console.log(`✅ Модель загружена. Мешей: ${result.meshes.length}`);

      // Находим корневой меш (если есть)
      const rootMesh = result.meshes.find(mesh => 
        mesh.name === "__root__" || mesh.name === "root" || mesh.name === "scene"
      ) || null;

      return {
        meshes: result.meshes,
        rootMesh: rootMesh
      };
    } catch (error) {
      console.error("❌ Ошибка загрузки модели:", error);
      throw error;
    }
  }

  /**
   * Очистка предыдущей модели (если нужно)
   */
  public unloadModel(): void {
    // Ищем и удаляем все меши, связанные с моделью
    const meshesToRemove = this._scene.meshes.filter(mesh => 
      mesh.name.startsWith("SM_") || 
      mesh.name.includes("building") ||
      mesh.name.includes("Floor")
    );
    
    meshesToRemove.forEach(mesh => mesh.dispose());
    console.log(`🧹 Очищено ${meshesToRemove.length} мешей`);
  }
}