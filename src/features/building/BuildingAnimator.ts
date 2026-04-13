import { Scene, Animation, SineEase, EasingFunction } from "@babylonjs/core";
import { injectable } from "inversify";
import { BuildingElement } from "../../shared/types";
import { BUILDING_ANIMATION } from "../../shared/constants";
import { IBuildingAnimator } from "@shared/interfaces";

/**
 * Аниматор строительства здания
 * Анимация "падения" элементов здания сверху вниз
 */
@injectable()
export class BuildingAnimator implements IBuildingAnimator {
    private readonly START_HEIGHT = BUILDING_ANIMATION.START_HEIGHT_OFFSET * 10;
    private readonly BASE_DURATION = BUILDING_ANIMATION.BASE_DURATION;
    private readonly FLOOR_DELAY = BUILDING_ANIMATION.FLOOR_DELAY;
    private readonly WALL_DELAY = BUILDING_ANIMATION.WALL_DELAY;
    private readonly WALL_STAGGER = BUILDING_ANIMATION.WALL_STAGGER;
    private readonly SPEED_FACTOR = BUILDING_ANIMATION.SPEED_FACTOR;
    private readonly FRAME_RATE = BUILDING_ANIMATION.FRAME_RATE;
    private scene?: Scene;

    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    /**
     * Анимировать строительство здания (поэтажное "падение" элементов)
     */
    public async animateConstruction(
        floors: Map<number, BuildingElement[]>,
        wallsByFloor: Map<number, BuildingElement[]>
    ): Promise<void> {
        if (!this.scene) throw new Error("Scene not set");

        const floorNumbers = Array.from(floors.keys()).sort((a, b) => a - b);
        const maxFloor = Math.max(...floorNumbers);
        const minFloor = Math.min(...floorNumbers);

        const animations: Promise<void>[] = [];

        floorNumbers.forEach((floorNum) => {
            const floorElements = floors.get(floorNum) || [];
            const wallElements = wallsByFloor.get(floorNum) || [];

            // Чем ниже этаж, тем быстрее падает
            const speedRatio = 1 + ((maxFloor - floorNum) * (this.SPEED_FACTOR - 1) / (maxFloor - minFloor || 1));
            const duration = this.BASE_DURATION / speedRatio;

            // Чем ниже этаж, тем меньше задержка
            const startDelay = (floorNum - minFloor) * this.FLOOR_DELAY;

            floorElements.forEach(element => {
                animations.push(this.animateElementDrop(element, startDelay, duration));
            });

            wallElements.forEach((wall, index) => {
                const wallDelay = startDelay + this.WALL_DELAY + (index * this.WALL_STAGGER);
                animations.push(this.animateElementDrop(wall, wallDelay, duration * 0.9));
            });
        });

        await Promise.all(animations);
    }

    /**
     * Анимировать падение одного элемента
     */
    private animateElementDrop(element: BuildingElement, delay: number, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const mesh = element.mesh;

            if (!mesh.metadata?.originalPosition) {
                mesh.metadata ??= {};
                mesh.metadata.originalPosition = mesh.position.clone();
            }

            const originalY = mesh.metadata.originalPosition.y;
            const startY = originalY + this.START_HEIGHT;

            mesh.position.y = startY;
            mesh.isVisible = true;

            setTimeout(() => {
                const anim = new Animation(
                    `anim_${element.name}`,
                    "position.y",
                    this.FRAME_RATE,
                    Animation.ANIMATIONTYPE_FLOAT,
                    Animation.ANIMATIONLOOPMODE_CONSTANT
                );

                const frames = Math.round(duration / (1000 / this.FRAME_RATE));
                anim.setKeys([
                    { frame: 0, value: startY },
                    { frame: frames, value: originalY }
                ]);

                const easing = new SineEase();
                easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
                anim.setEasingFunction(easing);

                mesh.animations = [anim];

                this.scene!.beginAnimation(mesh, 0, frames, false, 1.0, () => {
                    mesh.position.y = originalY;
                    resolve();
                });
            }, delay);
        });
    }

    public resetAllElements(elements: BuildingElement[]): void {
        elements.forEach(element => {
            const mesh = element.mesh;
            if (mesh.metadata?.originalPosition) {
                mesh.position.copyFrom(mesh.metadata.originalPosition);
            }
            mesh.isVisible = true;
        });
    }
}