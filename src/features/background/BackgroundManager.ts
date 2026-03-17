import { Scene, Color3, Color4, MeshBuilder, ShaderMaterial, Vector3 } from "@babylonjs/core";
import { 
  SKY_COLOR_TOP, 
  SKY_COLOR_MIDDLE,
  SKY_COLOR_BOTTOM,
  SKY_GRADIENT_ENABLED
} from "../../shared/constants";
import { logger } from "../../core/logger/Logger";

const bgLogger = logger.getLogger('BackgroundManager');

export class BackgroundManager {
  private static _instance: BackgroundManager;
  private _scene: Scene;
  private _isInitialized: boolean = false;
  private _skySphere: any;

  private constructor(scene: Scene) {
    this._scene = scene;
  }

  public static getInstance(scene: Scene): BackgroundManager {
    if (!BackgroundManager._instance) {
      BackgroundManager._instance = new BackgroundManager(scene);
    }
    return BackgroundManager._instance;
  }

  public async initialize(onProgress?: (progress: number) => void): Promise<void> {
    bgLogger.debug("Инициализация фона");
    
    onProgress?.(0.1);
    onProgress?.(0.3);
    this.createGradientSky();
    
    onProgress?.(0.6);
    
    onProgress?.(0.9);
    this._isInitialized = true;
    onProgress?.(1.0);
    
    bgLogger.info("Фон инициализирован");
  }

  private createGradientSky(): void {
    if (SKY_GRADIENT_ENABLED) {
      this.createGradientSphere();
    } else {
      const midColor = new Color3(
        (SKY_COLOR_TOP.r + SKY_COLOR_BOTTOM.r) / 2,
        (SKY_COLOR_TOP.g + SKY_COLOR_BOTTOM.g) / 2,
        (SKY_COLOR_TOP.b + SKY_COLOR_BOTTOM.b) / 2
      );
      this._scene.clearColor = new Color4(midColor.r, midColor.g, midColor.b, 1.0);
    }
  }

  private createGradientSphere(): void {
    // Создаём сферу для неба
    this._skySphere = MeshBuilder.CreateSphere("skySphere", {
      diameter: 1000,
      segments: 32
    }, this._scene);
    
    this._skySphere.isPickable = false;
    
    // Создаём шейдерный материал
    const shaderMaterial = new ShaderMaterial(
      "gradientShader",
      this._scene,
      {
        vertexSource: `
          precision highp float;
          attribute vec3 position;
          uniform mat4 worldViewProjection;
          varying vec3 vPosition;
          
          void main() {
            vPosition = position;
            gl_Position = worldViewProjection * vec4(position, 1.0);
          }
        `,
        fragmentSource: `
          precision highp float;
          varying vec3 vPosition;
          uniform vec3 uTopColor;
          uniform vec3 uMiddleColor;
          uniform vec3 uBottomColor;
          
          void main() {
            // Нормализуем Y координату от -1 до 1
            float t = (vPosition.y / 500.0 + 1.0) / 2.0; // Преобразуем в диапазон 0-1
            
            vec3 color;
            if (t < 0.3) {
              // Верхняя часть (чистый верхний цвет)
              color = uTopColor;
            } else if (t < 0.7) {
              // Средняя часть (смешивание верхнего и среднего)
              float localT = (t - 0.3) / 0.4;
              color = mix(uTopColor, uMiddleColor, localT);
            } else {
              // Нижняя часть (смешивание среднего и нижнего)
              float localT = (t - 0.7) / 0.3;
              color = mix(uMiddleColor, uBottomColor, localT);
            }
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      {
        attributes: ["position"],
        uniforms: ["worldViewProjection", "uTopColor", "uMiddleColor", "uBottomColor"]
      }
    );

    // Устанавливаем цвета
    shaderMaterial.setVector3("uTopColor", new Vector3(SKY_COLOR_TOP.r, SKY_COLOR_TOP.g, SKY_COLOR_TOP.b));
    shaderMaterial.setVector3("uMiddleColor", new Vector3(SKY_COLOR_MIDDLE.r, SKY_COLOR_MIDDLE.g, SKY_COLOR_MIDDLE.b));
    shaderMaterial.setVector3("uBottomColor", new Vector3(SKY_COLOR_BOTTOM.r, SKY_COLOR_BOTTOM.g, SKY_COLOR_BOTTOM.b));
    
    // Отключаем освещение и backface culling для сферы
    shaderMaterial.backFaceCulling = false;
    shaderMaterial.disableDepthWrite = true;
    
    this._skySphere.material = shaderMaterial;
    
    // Поворачиваем сферу для правильной ориентации
    this._skySphere.rotation.x = Math.PI / 2;
    
    bgLogger.debug("Градиентная сфера создана через шейдер", {
      top: this.color3ToCss(SKY_COLOR_TOP),
      middle: this.color3ToCss(SKY_COLOR_MIDDLE),
      bottom: this.color3ToCss(SKY_COLOR_BOTTOM)
    });
  }

  private color3ToCss(color: Color3): string {
    return `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
  }

  public update(_deltaTime: number): void {}

  public setBackgroundColor(color: Color3): void {
    if (!SKY_GRADIENT_ENABLED) {
      this._scene.clearColor = new Color4(color.r, color.g, color.b, 1.0);
    }
  }

  public setFogDensity(density: number): void {
    this._scene.fogDensity = density;
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get fogDensity(): number {
    return this._scene.fogDensity;
  }
}