import { Scene, Animation, Vector3, SineEase, EasingFunction } from "@babylonjs/core";
import { BuildingElement } from "./types";
import { logger } from "../../core/logger/Logger";

const animatorLogger = logger.getLogger('BuildingAnimator');

export class BuildingAnimator {
  private readonly START_HEIGHT = 100;
  private readonly BASE_DURATION = 3000;
  private readonly FLOOR_DELAY = 200;
  private readonly WALL_DELAY = 100;
  private readonly WALL_STAGGER = 20;
  private readonly SPEED_FACTOR = 2.0;
  private readonly FRAME_RATE = 60;

  constructor(private readonly _scene: Scene) {}

  public async animateConstruction(
    floors: Map<number, BuildingElement[]>,
    wallsByFloor: Map<number, BuildingElement[]>
  ): Promise<void> {
    animatorLogger.info("Запуск анимации строительства");

    const floorNumbers = Array.from(floors.keys()).sort((a, b) => b - a);
    const maxFloor = Math.max(...floorNumbers);
    const minFloor = Math.min(...floorNumbers);
    
    const animations: Promise<void>[] = [];

    floorNumbers.forEach((floorNum) => {
      const floorElements = floors.get(floorNum) || [];
      const wallElements = wallsByFloor.get(floorNum) || [];
      
      const speedRatio = 1 + ((maxFloor - floorNum) * (this.SPEED_FACTOR - 1) / (maxFloor - minFloor || 1));
      const duration = this.BASE_DURATION / speedRatio;
      
      const startDelay = (maxFloor - floorNum) * this.FLOOR_DELAY;
      
      animatorLogger.debug(`Этаж ${floorNum}: скорость=${speedRatio.toFixed(2)}x, длительность=${duration.toFixed(0)}ms, задержка=${startDelay}ms`);
      
      floorElements.forEach(element => {
        animations.push(this.animateElementDrop(element, startDelay, duration));
      });
      
      wallElements.forEach((wall, index) => {
        const wallDelay = startDelay + this.WALL_DELAY + (index * this.WALL_STAGGER);
        animations.push(this.animateElementDrop(wall, wallDelay, duration * 0.9));
      });
    });

    animatorLogger.debug(`Запущено анимаций: ${animations.length}`);
    await Promise.all(animations);
    animatorLogger.info("Анимация строительства завершена");
  }

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
      mesh.setEnabled(true);
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
        
        this._scene.beginAnimation(mesh, 0, frames, false, 1.0, () => {
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
      mesh.setEnabled(true);
      mesh.isVisible = true;
    });
  }
}