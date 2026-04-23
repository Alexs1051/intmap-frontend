import { Scene } from "@babylonjs/core";
import { container } from "@core/di/container";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { ISceneComponentRegistration } from "@shared/types";
import {
    IBuildingManager,
    ICameraManager,
    ILoadableComponent,
    IMarkerManager,
    ISceneComponent,
    IUIManager
} from "@shared/interfaces";

type SceneAwareComponent = ISceneComponent & { setScene?(scene: Scene): void };

export interface SceneManagerRegistryContext {
    scene: Scene;
    logger: Logger;
    components: Map<string, ISceneComponent>;
    loadableComponents: Map<string, ILoadableComponent>;
    cameraManager?: ICameraManager;
    buildingManager?: IBuildingManager;
    markerManager?: IMarkerManager;
    uiManager?: IUIManager;
    registerComponent(name: string, component: ISceneComponent): void;
    setCameraManager(manager: ICameraManager): void;
    setBuildingManager(manager: IBuildingManager): void;
    setMarkerManager(manager: IMarkerManager): void;
    setUIManager(manager: IUIManager): void;
    createEmergencyCamera(): void;
}

export class SceneManagerRegistry {
    public registerComponents(
        context: SceneManagerRegistryContext,
        configs: ISceneComponentRegistration[]
    ): void {
        for (const config of configs) {
            this.registerComponentByConfig(context, config);
        }

        this.setupOptionalComponent(context, TYPES.CameraAnimator);
        this.setupOptionalManager<IUIManager>(context, TYPES.UIManager, (manager) => context.setUIManager(manager));

        if (context.markerManager && context.cameraManager) {
            context.markerManager.setCameraManager(context.cameraManager);
        }
    }

    public async initializeComponents(context: SceneManagerRegistryContext): Promise<void> {
        context.logger.debug("Initializing components");

        if (context.uiManager && context.cameraManager && context.buildingManager && context.markerManager) {
            try {
                context.uiManager.initialize(context.scene, {
                    cameraManager: context.cameraManager,
                    buildingManager: context.buildingManager,
                    markerManager: context.markerManager,
                    scene: context.scene
                });
                context.logger.info("UIManager initialized");

                context.buildingManager.setMarkerManager(context.markerManager);
                context.markerManager.setBuildingManager(context.buildingManager);
                context.logger.debug('MarkerManager set in BuildingManager -> FloorManager -> FloorExpander');
                context.logger.debug('BuildingManager set in MarkerManager');
            } catch (error) {
                context.logger.error("Error initializing UIManager", error);
            }
        }

        const deferredInitComponents = new Set<ISceneComponent | undefined>([
            context.cameraManager,
            context.markerManager
        ]);

        const initPromises = Array.from(context.components.values())
            .filter(component => component && typeof component.initialize === 'function')
            .filter(component => !deferredInitComponents.has(component))
            .map(component => {
                try {
                    return component.initialize();
                } catch (error) {
                    context.logger.error("Error initializing component", error);
                    return Promise.resolve();
                }
            });

        await Promise.all(initPromises);
        this.setupMarkerClickHandler(context);

        context.logger.debug(`Initialized ${initPromises.length} components`);

        if (!context.scene.activeCamera) {
            context.logger.error("No active camera after initialization!");
            context.createEmergencyCamera();
        } else {
            context.logger.info(`Active camera: ${context.scene.activeCamera.name}`);
        }
    }

    private registerComponentByConfig(
        context: SceneManagerRegistryContext,
        config: ISceneComponentRegistration
    ): void {
        try {
            if (!container.isBound(config.type)) {
                context.logger.warn(`Component ${config.name} not bound in container`);
                return;
            }

            const component = container.get<SceneAwareComponent>(config.type);

            if (config.setScene && component?.setScene) {
                component.setScene(context.scene);
            }

            context.registerComponent(config.name, component);
            this.saveManagerReference(context, config.name, component);

            context.logger.info(`${config.name} registered`);
        } catch (error) {
            context.logger.error(`Failed to register ${config.name}`, error);
        }
    }

    private saveManagerReference(
        context: SceneManagerRegistryContext,
        name: string,
        component: ISceneComponent
    ): void {
        switch (name) {
            case 'camera':
                context.setCameraManager(component as ICameraManager);
                break;
            case 'building':
                context.setBuildingManager(component as IBuildingManager);
                break;
            case 'markers':
                context.setMarkerManager(component as IMarkerManager);
                break;
        }
    }

    private setupOptionalComponent(context: SceneManagerRegistryContext, type: symbol): void {
        try {
            if (container.isBound(type)) {
                const component = container.get<SceneAwareComponent>(type);
                if (component?.setScene) {
                    component.setScene(context.scene);
                }
            }
        } catch (error) {
            context.logger.error(`Failed to setup optional component: ${type.toString()}`, error);
        }
    }

    private setupOptionalManager<T>(
        context: SceneManagerRegistryContext,
        type: symbol,
        setter: (manager: T) => void
    ): void {
        try {
            if (container.isBound(type)) {
                setter(container.get<T>(type));
                context.logger.info(`${type.toString()} obtained from container`);
            }
        } catch (error) {
            context.logger.error(`Failed to get optional manager: ${type.toString()}`, error);
        }
    }

    private setupMarkerClickHandler(context: SceneManagerRegistryContext): void {
        if (!context.markerManager) {
            context.logger.warn("Cannot setup marker click handler: markerManager not ready");
            return;
        }

        const canvas = this.getCanvas(context.scene);
        if (!canvas) {
            context.logger.warn("Cannot setup marker click handler: canvas not found");
            return;
        }

        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
            const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
            const ray = context.scene.createPickingRay(x, y, null, context.scene.activeCamera);

            context.markerManager!.handleScenePick(ray);
        });

        context.logger.info("Marker click handler setup complete");
    }

    private getCanvas(scene: Scene): HTMLCanvasElement | null {
        try {
            return scene.getEngine().getRenderingCanvas();
        } catch {
            return null;
        }
    }
}
