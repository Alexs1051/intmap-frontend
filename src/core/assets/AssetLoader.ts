import { injectable, inject } from "inversify";
import { Scene, SceneLoader, Mesh, TransformNode, Texture } from "@babylonjs/core";
import { TYPES } from "@core/di/Container";
import { Logger } from "@core/logger/Logger";
import { EventBus } from "@core/events/EventBus";
import { EventType } from "@core/events/EventTypes";
import { ILoadingProgress } from "@shared/types";

/**
 * Менеджер загрузки ассетов
 */
@injectable()
export class AssetLoader {
  private logger: Logger;
  private eventBus: EventBus;

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.EventBus) eventBus: EventBus  ) {
    this.logger = logger.getLogger('AssetLoader');
    this.eventBus = eventBus;
  }

  /**
   * Загрузить GLB модель
   */
  public async loadModel(
    scene: Scene,
    url: string,
    onProgress?: (progress: ILoadingProgress) => void
  ): Promise<{ meshes: Mesh[]; rootNode: TransformNode }> {
    this.logger.info(`Loading model from: ${url}`);
    this.eventBus.emit(EventType.LOADING_START, { url, type: 'model' });

    return new Promise((resolve, reject) => {
      SceneLoader.ImportMesh(
        '',
        '',
        url,
        scene,
        (meshes, _particleSystems, _skeletons) => {
          const rootNode = new TransformNode('model_root', scene);
          meshes.forEach(mesh => {
            mesh.parent = rootNode;
          });
          
          this.logger.info(`Model loaded successfully, ${meshes.length} meshes`);
          this.eventBus.emit(EventType.LOADING_COMPLETE, { url, type: 'model', meshes: meshes.length });
          
          resolve({ meshes: meshes as Mesh[], rootNode });
        },
        (event) => {
          if (onProgress && event.lengthComputable) {
            const progress: ILoadingProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: event.loaded / event.total,
              task: 'Loading model...'
            };
            onProgress(progress);
            this.eventBus.emit(EventType.LOADING_PROGRESS, progress);
          }
        },
        (_scene, message, exception) => {
          this.logger.error(`Failed to load model: ${message}`, exception);
          this.eventBus.emit(EventType.LOADING_ERROR, { url, message, exception });
          reject(new Error(`Failed to load model: ${message}`));
        }
      );
    });
  }

  /**
   * Загрузить текстуру
   */
  public async loadTexture(scene: Scene, url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      try {
        const texture = new Texture(url, scene, {
          noMipmap: false,
          invertY: false,
          samplingMode: 0,
          onLoad: () => {
            resolve(texture);
          },
          onError: (message) => {
            reject(new Error(`Failed to load texture: ${url} - ${message}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Загрузить несколько ресурсов параллельно
   */
  public async loadAll<T>(
    loaders: Array<() => Promise<T>>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<T[]> {
    const total = loaders.length;
    let completed = 0;
    
    const promises = loaders.map(async (loader) => {
      const result = await loader();
      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
      return result;
    });
    
    return Promise.all(promises);
  }
}