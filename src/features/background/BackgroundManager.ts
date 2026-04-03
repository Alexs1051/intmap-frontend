import { Scene, Color3, Color4, MeshBuilder, ShaderMaterial, Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { BACKGROUND } from "../../shared/constants";
import { IBackgroundManager } from "@shared/interfaces";

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

    public setScene(scene: Scene): void {
        this.scene = scene;
        this.logger.debug("Scene set");
    }

    public async load(onProgress?: (progress: number) => void): Promise<void> {
        this.logger.debug("Loading background manager");
        
        if (!this.scene) {
            throw new Error("Scene not set");
        }
        
        onProgress?.(0.3);
        await this.createBackground();
        onProgress?.(0.6);
        this.setupFog();
        onProgress?.(1.0);
        
        this.logger.info("Background manager loaded");
    }

    public async initialize(): Promise<void> {
        this.logger.debug("Initializing background manager");
        if (this.isInitialized) return;
        
        if (this.gradientEnabled) {
            this.updateGradientSky();
        }
        
        this.isInitialized = true;
        this.logger.info("Background manager initialized");
    }

    public update(_deltaTime: number): void {}

    private async createBackground(): Promise<void> {
        if (this.gradientEnabled) {
            this.createGradientSphere();
        } else {
            this.setSimpleSkyColor(this.skyMiddle);
        }
        this.logger.debug(`Background created: ${this.gradientEnabled ? 'gradient' : 'simple color'}`);
    }

    private createGradientSphere(): void {
        if (this.skySphere) {
            this.skySphere.dispose();
        }
        
        this.skySphere = MeshBuilder.CreateSphere("skySphere", {
            diameter: 1000,
            segments: 64
        }, this.scene);
        
        this.skySphere.isPickable = false;
        
        const vertexShader = `
            precision highp float;
            attribute vec3 position;
            uniform mat4 worldViewProjection;
            varying vec3 vPosition;
            
            void main() {
                vPosition = position;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
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
        
        this.shaderMaterial = new ShaderMaterial(
            "gradientShader",
            this.scene,
            {
                vertexSource: vertexShader,
                fragmentSource: fragmentShader
            },
            {
                attributes: ["position"],
                uniforms: ["worldViewProjection", "uTopColor", "uMiddleColor", "uBottomColor"]
            }
        );
        
        this.updateGradientColors();
        
        this.shaderMaterial.backFaceCulling = false;
        this.shaderMaterial.disableDepthWrite = true;
        
        this.skySphere.material = this.shaderMaterial;
        this.skySphere.rotation.x = Math.PI / 2;
    }

    private updateGradientColors(): void {
        if (this.shaderMaterial) {
            this.shaderMaterial.setVector3("uTopColor", new Vector3(this.skyTop.r, this.skyTop.g, this.skyTop.b));
            this.shaderMaterial.setVector3("uMiddleColor", new Vector3(this.skyMiddle.r, this.skyMiddle.g, this.skyMiddle.b));
            this.shaderMaterial.setVector3("uBottomColor", new Vector3(this.skyBottom.r, this.skyBottom.g, this.skyBottom.b));
        }
    }

    private setSimpleSkyColor(color: Color3): void {
        if (this.skySphere) {
            this.skySphere.dispose();
            this.skySphere = null;
        }
        this.scene.clearColor = new Color4(color.r, color.g, color.b, 1.0);
    }

    private setupFog(): void {
        if (this.fogEnabled) {
            this.scene.fogMode = Scene.FOGMODE_EXP;
            this.scene.fogDensity = BACKGROUND.FOG_DENSITY;
            this.scene.fogColor = BACKGROUND.FOG_COLOR;
        } else {
            this.scene.fogMode = Scene.FOGMODE_NONE;
        }
    }

    public setFogDensity(density: number): void {
        this.scene.fogDensity = Math.max(0, Math.min(0.1, density));
    }

    public setSkyColor(color: Color3): void {
        this.gradientEnabled = false;
        this.skyMiddle = color;
        this.setSimpleSkyColor(color);
    }

    public setGradientSky(top: Color3, middle: Color3, bottom: Color3): void {
        this.gradientEnabled = true;
        this.skyTop = top;
        this.skyMiddle = middle;
        this.skyBottom = bottom;
        
        if (this.isInitialized) {
            if (!this.skySphere) {
                this.createGradientSphere();
            } else {
                this.updateGradientColors();
            }
        }
    }

    private updateGradientSky(): void {
        if (this.skySphere) {
            this.updateGradientColors();
        } else {
            this.createGradientSphere();
        }
    }

    public setFogEnabled(enabled: boolean): void {
        this.fogEnabled = enabled;
        if (enabled) {
            this.scene.fogMode = Scene.FOGMODE_EXP;
        } else {
            this.scene.fogMode = Scene.FOGMODE_NONE;
        }
    }

    public dispose(): void {
        if (this.skySphere) {
            this.skySphere.dispose();
        }
        if (this.shaderMaterial) {
            this.shaderMaterial.dispose();
        }
        this.logger.info("BackgroundManager disposed");
    }
}