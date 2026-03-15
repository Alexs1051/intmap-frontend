import { Scene, MeshBuilder, StandardMaterial, Color3, Color4, Mesh, Texture } from "@babylonjs/core";
import { 
  SKY_COLOR_TOP, 
  SKY_COLOR_BOTTOM,
  SKY_COLOR_MIDDLE,
  SKY_GRADIENT_STOPS,
  SKY_EMISSIVE_INTENSITY,
  SKY_OPACITY,
  SKY_DOME_FLATTENING,
  FOG_ENABLED,
  FOG_DENSITY,
  FOG_COLOR
} from "../../shared/constants";

export class BackgroundManager {
  private static _instance: BackgroundManager;
  private _scene: Scene;

  private constructor(scene: Scene) {
    this._scene = scene;
    this.createGradientBackground();
  }

  public static getInstance(scene: Scene): BackgroundManager {
    if (!BackgroundManager._instance) {
      BackgroundManager._instance = new BackgroundManager(scene);
    }
    return BackgroundManager._instance;
  }

  private createGradientBackground(): void {
    // Чёрный фон
    this._scene.clearColor = new Color4(0, 0, 0, 1);
    
    // Создаём небо
    this.createSkyDome();
    
    // Добавляем туман
    if (FOG_ENABLED) {
      this.createFog();
    }
  }

  private createSkyDome(): void {
    const skyDome = MeshBuilder.CreateSphere("skyDome", {
      diameter: 2000,
      segments: 64,
      sideOrientation: Mesh.BACKSIDE
    }, this._scene);
    
    skyDome.isPickable = false;
    
    const material = new StandardMaterial("skyMaterial", this._scene);
    material.backFaceCulling = false;
    
    // ВАЖНО: Отключаем всё освещение
    material.disableLighting = true;
    
    // Убираем эмиссивный цвет - он мешает градиенту
    material.emissiveColor = new Color3(1, 1, 1);
    
    // Убираем диффузный и specular цвета
    material.diffuseColor = new Color3(0, 0, 0);
    material.specularColor = new Color3(0, 0, 0);
    material.ambientColor = new Color3(0, 0, 0);
    
    // Создаём градиент через canvas
    const canvas = this.createGradientCanvas();
    
    // Создаём текстуру
    const texture = new Texture("data:image/png", this._scene);
    texture.updateURL(canvas.toDataURL("image/png"));
    
    // ВАЖНО: Правильно настраиваем текстуру
    texture.uScale = 1.0;
    texture.vScale = 1.0;
    texture.uAng = 0;
    texture.vAng = 0;
    texture.wAng = 0;
    texture.coordinatesMode = Texture.EXPLICIT_MODE;
    
    // Используем текстуру как основной цвет
    material.diffuseTexture = texture;
    material.emissiveTexture = texture; // Дублируем для яркости
    
    // Настраиваем прозрачность
    material.alpha = SKY_OPACITY;
    material.useAlphaFromDiffuseTexture = true;
    
    // ВАЖНО: Включаем режим смешивания
    material.opacityTexture = texture;
    
    skyDome.material = material;
    skyDome.scaling.y = SKY_DOME_FLATTENING;
  }

  private createGradientCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 256;  // Увеличиваем для более плавного градиента
    canvas.height = 512;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    
    // Создаём градиент
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    
    // Добавляем точки градиента
    gradient.addColorStop(SKY_GRADIENT_STOPS.top, this.color3ToCss(SKY_COLOR_TOP));
    
    if (SKY_COLOR_MIDDLE) {
      gradient.addColorStop(SKY_GRADIENT_STOPS.middle, this.color3ToCss(SKY_COLOR_MIDDLE));
    }
    
    gradient.addColorStop(SKY_GRADIENT_STOPS.bottom, this.color3ToCss(SKY_COLOR_BOTTOM));
    
    // Заливаем градиентом
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Для отладки - выведем информацию в консоль
    console.log("Gradient created:", {
      top: this.color3ToCss(SKY_COLOR_TOP),
      middle: SKY_COLOR_MIDDLE ? this.color3ToCss(SKY_COLOR_MIDDLE) : null,
      bottom: this.color3ToCss(SKY_COLOR_BOTTOM),
      stops: SKY_GRADIENT_STOPS
    });
    
    return canvas;
  }

  private createFog(): void {
    this._scene.fogMode = Scene.FOGMODE_EXP;
    this._scene.fogDensity = FOG_DENSITY;
    this._scene.fogColor = FOG_COLOR.clone();
  }

  private color3ToCss(color: Color3): string {
    return `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
  }
}