import { Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { BabylonEngine } from "@core/engine/babylon-engine";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { ISceneComponentRegistration } from "@shared/types";
import {
    IBuildingManager,
    ICameraManager,
    ILoadableComponent,
    IMarkerManager,
    ISceneManager,
    IUIManager,
    ISceneComponent
} from "@shared/interfaces";
import { SceneManagerRegistry } from "./scene-manager-registry";
import { SceneManagerLoadingFlow } from "./scene-manager-loading-flow";

@injectable()
export class SceneManager implements ISceneManager {
    private _scene: Scene;
    private components: Map<string, ISceneComponent> = new Map();
    private loadableComponents: Map<string, ILoadableComponent> = new Map();
    private isLoadingFlag: boolean = false;
    private logger: Logger;
    private isDisposed: boolean = false;
    private readonly registry: SceneManagerRegistry;
    private readonly loadingFlow: SceneManagerLoadingFlow;

    public cameraManager?: ICameraManager;
    public buildingManager?: IBuildingManager;
    public markerManager?: IMarkerManager;
    public uiManager?: IUIManager;


    constructor(
        @inject(TYPES.BabylonEngine) private engine: BabylonEngine,
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.logger = logger.getLogger('SceneManager');
        this.registry = new SceneManagerRegistry();
        this.loadingFlow = new SceneManagerLoadingFlow();

        const babylonEngine = engine.getEngine();
        const existingScene = babylonEngine.scenes?.[0];

        if (existingScene) {
            this._scene = existingScene;
        } else {
            this._scene = new Scene(babylonEngine);
        }

        this.registerComponents();
        this.logger.info("SceneManager initialized");
    }

    private getComponentConfigs(): ISceneComponentRegistration[] {
        return [
            { name: 'camera', type: TYPES.CameraManager, setScene: true, isLoadable: true },
            { name: 'background', type: TYPES.BackgroundManager, setScene: true, isLoadable: true },
            { name: 'grid', type: TYPES.GridManager, setScene: true, isLoadable: true },
            { name: 'lighting', type: TYPES.LightingManager, setScene: true, isLoadable: true },
            { name: 'building', type: TYPES.BuildingManager, setScene: true, isLoadable: true },
            { name: 'markers', type: TYPES.MarkerManager, setScene: true, isLoadable: true }
        ];
    }

    private registerComponents(): void {
        this.registry.registerComponents(this.getRegistryContext(), this.getComponentConfigs());

        if (this.markerManager && this.cameraManager) {
            this.markerManager.setCameraManager(this.cameraManager);
        }
    }

    private getRegistryContext() {
        return {
            scene: this._scene,
            logger: this.logger,
            components: this.components,
            loadableComponents: this.loadableComponents,
            cameraManager: this.cameraManager,
            buildingManager: this.buildingManager,
            markerManager: this.markerManager,
            uiManager: this.uiManager,
            registerComponent: (name: string, component: ISceneComponent) => this.registerComponent(name, component),
            setCameraManager: (manager: ICameraManager) => {
                this.cameraManager = manager;
            },
            setBuildingManager: (manager: IBuildingManager) => {
                this.buildingManager = manager;
            },
            setMarkerManager: (manager: IMarkerManager) => {
                this.markerManager = manager;
            },
            setUIManager: (manager: IUIManager) => {
                this.uiManager = manager;
            },
            createEmergencyCamera: () => this.createEmergencyCamera()
        };
    }

    private getLoadingContext() {
        return {
            logger: this.logger,
            eventBus: this.eventBus,
            loadableComponents: this.loadableComponents,
            buildingManager: this.buildingManager,
            initializeComponents: () => this.initializeComponents(),
            setControlsEnabled: (enabled: boolean) => this.uiManager?.setControlsEnabled(enabled)
        };
    }

    public registerComponent(name: string, component: ISceneComponent): void {
        this.components.set(name, component);

        if (this.isLoadableComponent(component)) {
            this.loadableComponents.set(name, component);
        }

        this.logger.debug(`Component registered: ${name}`);
    }

    private isLoadableComponent(component: ISceneComponent): component is ILoadableComponent {
        return component && 'load' in component && typeof (component as any).load === 'function';
    }

    public async loadAll(modelUrl: string | string[]): Promise<void> {
        if (this.isLoadingFlag) {
            this.logger.warn("Loading already in progress");
            return;
        }

        this.isLoadingFlag = true;

        try {
            await this.loadingFlow.loadAll(this.getLoadingContext(), modelUrl);
        } catch (error) {
            this.logger.error("Failed to load resources", error);
            this.eventBus.emit(EventType.LOADING_ERROR, { error });
            throw error;
        } finally {
            this.isLoadingFlag = false;
            this.eventBus.emit(EventType.LOADING_COMPLETE);
        }
    }

    private async initializeComponents(): Promise<void> {
        if (this.markerManager && this.cameraManager) {
            this.markerManager.setCameraManager(this.cameraManager);
        }

        await this.registry.initializeComponents(this.getRegistryContext());
    }

    private createEmergencyCamera(): void {
        this.logger.warn("Creating emergency camera");

        const emergencyCamera = new ArcRotateCamera(
            "emergencyCamera",
            -Math.PI / 2,
            Math.PI / 3,
            40,
            Vector3.Zero(),
            this._scene
        );

        emergencyCamera.maxZ = 2000;
        emergencyCamera.lowerRadiusLimit = 5;
        emergencyCamera.upperRadiusLimit = 500;

        const canvas = this.engine.getCanvas();
        if (canvas) {
            emergencyCamera.attachControl(canvas, true);
        }

        this._scene.activeCamera = emergencyCamera;
        this.logger.info("Emergency camera created");
    }

    public async showScene(): Promise<void> {
        this.logger.info("Showing scene");
        await new Promise(resolve => setTimeout(resolve, 100));
        this.eventBus.emit(EventType.SCENE_READY);
    }

    public render(deltaTime: number): void {
        if (this.isDisposed) return;

        this.eventBus.emit(EventType.SCENE_BEFORE_RENDER, { deltaTime });

        this.components.forEach(component => {
            try {
                if (component && typeof component.update === 'function') {
                    component.update(deltaTime);
                }
            } catch (error) {
                this.logger.error("Error updating component", error);
            }
        });

        this._scene.render();

        if (this.uiManager) {
            this.uiManager.updateFPS();
        }

        this.eventBus.emit(EventType.SCENE_AFTER_RENDER, { deltaTime });
    }

    public dispose(): void {
        if (this.isDisposed) return;

        this.components.forEach(component => {
            try {
                if (component && typeof component.dispose === 'function') {
                    component.dispose();
                }
            } catch (error) {
                this.logger.error("Error disposing component", error);
            }
        });

        this.components.clear();
        this.loadableComponents.clear();

        if (this._scene) {
            this._scene.dispose();
        }

        this.isDisposed = true;
        this.logger.info("SceneManager disposed");
    }

    public get scene(): Scene {
        return this._scene;
    }

    public get isLoading(): boolean {
        return this.isLoadingFlag;
    }

    public getCameraManager(): ICameraManager | undefined {
        return this.cameraManager;
    }

    public getBuildingManager(): IBuildingManager | undefined {
        return this.buildingManager;
    }

    public getMarkerManager(): IMarkerManager | undefined {
        return this.markerManager;
    }

    public getUIManager(): IUIManager | undefined {
        return this.uiManager;
    }
}
