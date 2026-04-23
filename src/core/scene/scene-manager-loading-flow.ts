import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { Logger } from "@core/logger/logger";
import { IBuildingManager, ILoadableComponent } from "@shared/interfaces";

export interface SceneManagerLoadingContext {
    logger: Logger;
    eventBus: EventBus;
    loadableComponents: Map<string, ILoadableComponent>;
    buildingManager?: IBuildingManager;
    initializeComponents(): Promise<void>;
    setControlsEnabled(enabled: boolean): void;
}

export class SceneManagerLoadingFlow {
    public async loadAll(context: SceneManagerLoadingContext, modelUrl: string | string[]): Promise<void> {
        context.eventBus.emit(EventType.LOADING_START, { modelUrl });

        const components = Array.from(context.loadableComponents.entries());
        const normalComponents = components.filter(([name]) => name !== 'building');
        let completedNormal = 0;
        const totalNormal = normalComponents.length;

        context.eventBus.emit(EventType.LOADING_PROGRESS, {
            component: 'environment',
            progress: 0,
            overall: 0
        });

        await this.delay(100);

        for (const [name, component] of normalComponents) {
            context.logger.debug(`Loading component: ${name}`);

            context.eventBus.emit(EventType.LOADING_PROGRESS, {
                component: name,
                progress: 0,
                overall: totalNormal > 0 ? (completedNormal / totalNormal) * 0.3 : 0
            });

            await component.load((progress) => {
                const componentStart = totalNormal > 0 ? completedNormal / totalNormal : 0;
                const componentEnd = totalNormal > 0 ? (completedNormal + 1) / totalNormal : 1;
                const overallProgress = (componentStart + (progress * (componentEnd - componentStart))) * 0.3;
                context.eventBus.emit(EventType.LOADING_PROGRESS, {
                    component: name,
                    progress,
                    overall: overallProgress
                });
            });

            completedNormal++;

            context.eventBus.emit(EventType.LOADING_PROGRESS, {
                component: name,
                progress: 1,
                overall: totalNormal > 0 ? (completedNormal / totalNormal) * 0.3 : 0.3
            });

            await this.delay(50);
        }

        if (context.buildingManager) {
            context.logger.debug("Loading building model...");
            context.setControlsEnabled(false);

            context.eventBus.emit(EventType.LOADING_PROGRESS, {
                component: 'building',
                progress: 0,
                overall: 0.3
            });

            await this.delay(100);

            await context.buildingManager.loadBuilding(modelUrl, (progress: number) => {
                const overallProgress = 0.3 + (progress * 0.7);
                context.eventBus.emit(EventType.LOADING_PROGRESS, {
                    component: 'building',
                    progress,
                    overall: overallProgress
                });
            });

            context.eventBus.emit(EventType.LOADING_PROGRESS, {
                component: 'building',
                progress: 1,
                overall: 1
            });

            await this.delay(100);
        }

        await context.initializeComponents();
        context.setControlsEnabled(true);
        context.logger.info("All resources loaded successfully");
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
