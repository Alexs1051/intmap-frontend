import { Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../di/Container";
import { BabylonEngine } from "../engine/BabylonEngine";
import { Logger } from "../logger/Logger";
import { EventBus } from "../events/EventBus";
import { EventType } from "../events/EventTypes";
import { container } from "../di/Container";
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

@injectable()
export class SceneManager implements ISceneManager {
    private _scene: Scene;
    private components: Map<string, ISceneComponent> = new Map();
    private loadableComponents: Map<string, ILoadableComponent> = new Map();
    private isLoadingFlag: boolean = false;
    private logger: Logger;
    private isDisposed: boolean = false;

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
        const configs = this.getComponentConfigs();

        for (const config of configs) {
            this.registerComponentByConfig(config);
        }

        // Setup CameraAnimator separately
        this.setupOptionalComponent(TYPES.CameraAnimator);

        // Get UIManager from container
        this.setupOptionalManager(TYPES.UIManager, 'uiManager');

        // Link marker and camera
        if (this.markerManager && this.cameraManager) {
            this.markerManager.setCameraManager(this.cameraManager);
        }
    }

    private registerComponentByConfig(config: ISceneComponentRegistration): void {
        try {
            if (!container.isBound(config.type)) {
                this.logger.warn(`Component ${config.name} not bound in container`);
                return;
            }

            const component = container.get<any>(config.type);

            if (config.setScene && component?.setScene) {
                component.setScene(this._scene);
            }

            this.registerComponent(config.name, component);

            // Save manager references
            this.saveManagerReference(config.name, component);

            this.logger.info(`${config.name} registered`);
        } catch (error) {
            this.logger.error(`Failed to register ${config.name}`, error);
        }
    }

    private saveManagerReference(name: string, component: any): void {
        const managerMap: Record<string, string> = {
            'camera': 'cameraManager',
            'building': 'buildingManager',
            'markers': 'markerManager'
        };

        const propName = managerMap[name];
        if (propName) {
            (this as any)[propName] = component;
        }
    }

    private setupOptionalComponent(type: symbol): void {
        try {
            if (container.isBound(type)) {
                const component = container.get<any>(type);
                if (component?.setScene) {
                    component.setScene(this._scene);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to setup optional component: ${type.toString()}`, error);
        }
    }

    private setupOptionalManager(type: symbol, propName: string): void {
        try {
            if (container.isBound(type)) {
                (this as any)[propName] = container.get<any>(type);
                this.logger.info(`${propName} obtained from container`);
            }
        } catch (error) {
            this.logger.error(`Failed to get ${propName}`, error);
        }
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

    public async loadAll(modelUrl: string): Promise<void> {
        if (this.isLoadingFlag) {
            this.logger.warn("Loading already in progress");
            return;
        }

        this.isLoadingFlag = true;
        this.eventBus.emit(EventType.LOADING_START, { modelUrl });

        try {
            const components = Array.from(this.loadableComponents.entries());
            const normalComponents = components.filter(([name]) => name !== 'building');
            let completedNormal = 0;
            const totalNormal = normalComponents.length;

            this.eventBus.emit(EventType.LOADING_PROGRESS, {
                component: 'environment',
                progress: 0,
                overall: 0
            });

            await this.delay(100);

            for (const [name, component] of normalComponents) {
                this.logger.debug(`Loading component: ${name}`);

                this.eventBus.emit(EventType.LOADING_PROGRESS, {
                    component: name,
                    progress: 0,
                    overall: (completedNormal / totalNormal) * 0.3
                });

                await component.load((progress) => {
                    const componentStart = completedNormal / totalNormal;
                    const componentEnd = (completedNormal + 1) / totalNormal;
                    const overallProgress = (componentStart + (progress * (componentEnd - componentStart))) * 0.3;
                    this.eventBus.emit(EventType.LOADING_PROGRESS, {
                        component: name,
                        progress,
                        overall: overallProgress
                    });
                });

                completedNormal++;

                this.eventBus.emit(EventType.LOADING_PROGRESS, {
                    component: name,
                    progress: 1,
                    overall: (completedNormal / totalNormal) * 0.3
                });

                await this.delay(50);
            }

            if (this.buildingManager) {
                this.logger.debug("Loading building model...");

                this.eventBus.emit(EventType.LOADING_PROGRESS, {
                    component: 'building',
                    progress: 0,
                    overall: 0.3
                });

                await this.delay(100);

                await this.buildingManager.loadBuilding(modelUrl, (progress: number) => {
                    const overallProgress = 0.3 + (progress * 0.7);
                    this.eventBus.emit(EventType.LOADING_PROGRESS, {
                        component: 'building',
                        progress,
                        overall: overallProgress
                    });
                });

                this.eventBus.emit(EventType.LOADING_PROGRESS, {
                    component: 'building',
                    progress: 1,
                    overall: 1
                });

                await this.delay(100);
            }

            await this.initializeComponents();

            this.logger.info("All resources loaded successfully");

        } catch (error) {
            this.logger.error("Failed to load resources", error);
            this.eventBus.emit(EventType.LOADING_ERROR, { error });
            throw error;
        } finally {
            this.isLoadingFlag = false;
            this.eventBus.emit(EventType.LOADING_COMPLETE);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async initializeComponents(): Promise<void> {
        this.logger.debug("Initializing components");

        if (this.uiManager && this.cameraManager && this.buildingManager && this.markerManager) {
            try {
                this.uiManager.initialize(this._scene, {
                    cameraManager: this.cameraManager,
                    buildingManager: this.buildingManager,
                    markerManager: this.markerManager,
                    scene: this._scene
                });
                this.logger.info("UIManager initialized");
            } catch (error) {
                this.logger.error("Error initializing UIManager", error);
            }
        }

        const initPromises = Array.from(this.components.values())
            .filter(component => component && typeof component.initialize === 'function')
            .map(component => {
                try {
                    return component.initialize();
                } catch (error) {
                    this.logger.error("Error initializing component", error);
                    return Promise.resolve();
                }
            });

        await Promise.all(initPromises);

        this.setupMarkerClickHandler();

        this.logger.debug(`Initialized ${initPromises.length} components`);

        if (!this._scene.activeCamera) {
            this.logger.error("No active camera after initialization!");
            this.createEmergencyCamera();
        } else {
            this.logger.info(`Active camera: ${this._scene.activeCamera.name}`);
        }
    }

    private setupMarkerClickHandler(): void {
        if (!this._scene || !this.markerManager) {
            this.logger.warn("Cannot setup marker click handler: scene or markerManager not ready");
            return;
        }

        const canvas = this.getCanvas();
        if (!canvas) {
            this.logger.warn("Cannot setup marker click handler: canvas not found");
            return;
        }

        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
            const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
            const ray = this._scene.createPickingRay(x, y, null, this._scene.activeCamera);

            this.markerManager!.handleScenePick(ray);
        });

        this.logger.info("Marker click handler setup complete");
    }

    private getCanvas(): HTMLCanvasElement | null {
        try {
            return this._scene.getEngine().getRenderingCanvas();
        } catch {
            return null;
        }
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