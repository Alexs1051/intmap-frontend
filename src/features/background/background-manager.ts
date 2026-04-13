import { Scene, Color3, Color4, MeshBuilder, ShaderMaterial, Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { BACKGROUND } from "@shared/constants";
import { IBackgroundManager } from "@shared/interfaces";

// Шейдеры для градиентного неба
const SKY_VERTEX_SHADER = `
    precision highp float;
    attribute vec3 position;
    uniform mat4 worldViewProjection;
    varying vec3 vPosition;

    void main() {
        vPosition = position;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

const SKY_FRAGMENT_SHADER = `
    precision highp float;
    varying vec3 vPosition;
    uniform vec3 uTopColor;
    uniform vec3 uMiddleColor;
    uniform vec3 uBottomColor;

    void main() {
        float t = (vPosition.y / 500.0 + 1.0) / 2.0;

        vec3 color;
        if (t < 0.3) {
            color = uTopColor;
        } else if (t < 0.7) {
            float localT = (t - 0.3) / 0.4;
            color = mix(uTopColor, uMiddleColor, localT);
        } else {
            float localT = (t - 0.7) / 0.3;
            color = mix(uMiddleColor, uBottomColor, localT);
        }

        gl_FragColor = vec4(color, 1.0);
    }
`;

/**
 * Менеджер заднего фона (небо, туман, градиент)
 * Управляет небесной сферой и настройками тумана сцены
 */
@injectable()
export class BackgroundManager implements IBackgroundManager {
    private scene!: Scene;
    private logger: Logger;

    private skySphere: any = null;
    private shaderMaterial: ShaderMaterial | null = null;
    private isInitialized: boolean = false;
    private fogEnabled: boolean = BACKGROUND.FOG_ENABLED;
    private gradientEnabled: boolean = BACKGROUND.GRADIENT_ENABLED;

    private skyTop: Color3 = BACKGROUND.SKY_TOP;
    private skyMiddle: Color3 = BACKGROUND.SKY_MIDDLE;
    private skyBottom: Color3 = BACKGROUND.SKY_BOTTOM;

    constructor(@inject(TYPES.Logger) logger: Logger) {
        this.logger = logger.getLogger('BackgroundManager');
    }

    /**
     * Установить сцену
     */
    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    /**
     * Загрузить менеджер и создать фон
     */
    public async load(onProgress?: (progress: number) => void): Promise<void> {
        if (!this.scene) {
            throw new Error("Scene not set");
        }

        onProgress?.(0.3);
        await this.createBackground();
        onProgress?.(0.6);
        this.setupFog();
        onProgress?.(1.0);

        this.logger.info("Background loaded");
    }

    /**
     * Инициализировать градиент (вызывается после загрузки здания)
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        if (this.gradientEnabled) {
            this.ensureGradientSphere();
        }

        this.isInitialized = true;
        this.logger.info("Background initialized");
    }

    public update(_deltaTime: number): void { }

    /**
     * Создать фон: градиентная сфера или простой цвет
     */
    private async createBackground(): Promise<void> {
        if (this.gradientEnabled) {
            this.createGradientSphere();
        } else {
            this.scene.clearColor = this.createColor4(this.skyMiddle);
        }
    }

    /**
     * Создать или обновить градиентную сферу
     */
    private ensureGradientSphere(): void {
        if (!this.skySphere) {
            this.createGradientSphere();
        } else {
            this.updateGradientColors();
        }
    }

    /**
     * Создать сферу с градиентным шейдером
     */
    private createGradientSphere(): void {
        if (this.skySphere) {
            this.skySphere.dispose();
        }

        this.skySphere = MeshBuilder.CreateSphere("skySphere", {
            diameter: BACKGROUND.SKY_DIAMETER ?? 1000,
            segments: 64
        }, this.scene);

        this.skySphere.isPickable = false;

        this.shaderMaterial = new ShaderMaterial(
            "gradientShader",
            this.scene,
            {
                vertexSource: SKY_VERTEX_SHADER,
                fragmentSource: SKY_FRAGMENT_SHADER
            },
            {
                attributes: ["position"],
                uniforms: ["worldViewProjection", "uTopColor", "uMiddleColor", "uBottomColor"]
            }
        );

        this.shaderMaterial.backFaceCulling = false;
        this.shaderMaterial.disableDepthWrite = true;

        this.updateGradientColors();

        this.skySphere.material = this.shaderMaterial;
        this.skySphere.rotation.x = Math.PI / 2;
    }

    /**
     * Обновить цвета градиента в шейдере
     */
    private updateGradientColors(): void {
        if (!this.shaderMaterial) return;

        this.shaderMaterial.setVector3("uTopColor", this.toVector3(this.skyTop));
        this.shaderMaterial.setVector3("uMiddleColor", this.toVector3(this.skyMiddle));
        this.shaderMaterial.setVector3("uBottomColor", this.toVector3(this.skyBottom));
    }

    /**
     * Настроить туман сцены
     */
    private setupFog(): void {
        this.scene.fogMode = this.fogEnabled ? Scene.FOGMODE_EXP : Scene.FOGMODE_NONE;
        this.scene.fogDensity = BACKGROUND.FOG_DENSITY;
        this.scene.fogColor = BACKGROUND.FOG_COLOR;
    }

    /**
     * Установить плотность тумана (0-0.1)
     */
    public setFogDensity(density: number): void {
        this.scene.fogDensity = Math.max(0, Math.min(0.1, density));
    }

    /**
     * Установить простой цвет неба (отключает градиент)
     */
    public setSkyColor(color: Color3): void {
        this.gradientEnabled = false;
        this.skyMiddle = color;
        this.scene.clearColor = this.createColor4(color);

        if (this.skySphere) {
            this.skySphere.dispose();
            this.skySphere = null;
            this.shaderMaterial?.dispose();
            this.shaderMaterial = null;
        }
    }

    /**
     * Установить градиент неба
     */
    public setGradientSky(top: Color3, middle: Color3, bottom: Color3): void {
        this.gradientEnabled = true;
        this.skyTop = top;
        this.skyMiddle = middle;
        this.skyBottom = bottom;

        if (this.isInitialized) {
            this.ensureGradientSphere();
        }
    }

    /**
     * Включить/выключить туман
     */
    public setFogEnabled(enabled: boolean): void {
        this.fogEnabled = enabled;
        this.scene.fogMode = enabled ? Scene.FOGMODE_EXP : Scene.FOGMODE_NONE;
    }

    /**
     * Уничтожить ресурсы
     */
    public dispose(): void {
        this.skySphere?.dispose();
        this.shaderMaterial?.dispose();
        this.logger.info("BackgroundManager disposed");
    }

    /**
     * Преобразовать Color3 в Vector3 для шейдера
     */
    private toVector3(color: Color3): Vector3 {
        return new Vector3(color.r, color.g, color.b);
    }

    /**
     * Создать Color4 из Color3
     */
    private createColor4(color: Color3): Color4 {
        return new Color4(color.r, color.g, color.b, 1.0);
    }
}