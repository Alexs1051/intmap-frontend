import { Scene, TransformNode, Animation, Vector3, EasingFunction, SineEase } from "@babylonjs/core";
import { BuildingElement } from "./types";

export class BuildingAnimator {
  private _scene: Scene;
  
  // Настройки анимации
  private readonly START_HEIGHT = 100; // Все стартуют с одной высоты
  private readonly BASE_DURATION = 3000; // базовая длительность для верхнего этажа
  private readonly FLOOR_DELAY = 200; // задержка между этажами
  private readonly WALL_DELAY = 100; // задержка для стен
  private readonly WALL_STAGGER = 20; // микрозадержка между стенами
  private readonly SPEED_FACTOR = 2.0; // во сколько раз быстрее падает нижний этаж

  constructor(scene: Scene) {
    this._scene = scene;
  }

  /**
   * Анимация строительства здания сверху вниз
   * Нижние этажи приземляются первыми
   */
  public async animateConstruction(
    floors: Map<number, BuildingElement[]>,
    wallsByFloor: Map<number, BuildingElement[]>
  ): Promise<void> {
    console.log("🏗 Запуск анимации строительства...");

    const floorNumbers = Array.from(floors.keys()).sort((a, b) => b - a);
    const maxFloor = Math.max(...floorNumbers);
    const minFloor = Math.min(...floorNumbers);
    
    console.log(`  - Этажи: ${minFloor} (низ) → ${maxFloor} (верх)`);

    const animations: Promise<void>[] = [];

    floorNumbers.forEach((floorNum) => {
      const floorElements = floors.get(floorNum) || [];
      const wallElements = wallsByFloor.get(floorNum) || [];
      
      // Чем НИЖЕ этаж, тем БЫСТРЕЕ он должен падать (меньше длительность)
      // floorNum = 1 (низ) → самая высокая скорость
      // floorNum = 4 (верх) → самая низкая скорость
      const speedRatio = 1 + ((maxFloor - floorNum) * (this.SPEED_FACTOR - 1) / (maxFloor - minFloor || 1));
      
      // Длительность обратно пропорциональна скорости
      const duration = this.BASE_DURATION / speedRatio;
      
      // Задержка - чем ВЫШЕ этаж, тем ПОЗЖЕ начинает (больше задержка)
      const startDelay = (maxFloor - floorNum) * this.FLOOR_DELAY;
      
      console.log(`  📍 Этаж ${floorNum}: скорость=${speedRatio.toFixed(2)}x, длительность=${duration.toFixed(0)}ms, задержка=${startDelay}ms`);
      
      // Анимируем элементы этажа
      floorElements.forEach(element => {
        animations.push(this.animateElementDrop(element, startDelay, duration));
      });
      
      // Анимируем стены (начинаются чуть позже)
      wallElements.forEach((wall, wallIndex) => {
        const wallDelay = startDelay + this.WALL_DELAY + (wallIndex * this.WALL_STAGGER);
        const wallDuration = duration * 0.9; // стены чуть быстрее
        animations.push(this.animateElementDrop(wall, wallDelay, wallDuration));
      });
    });

    console.log(`  ⏳ Запущено анимаций: ${animations.length}`);
    await Promise.all(animations);
    console.log("✅ Анимация строительства завершена");
  }

  /**
   * Анимация падения элемента с одной стартовой высоты
   */
  private animateElementDrop(element: BuildingElement, delay: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const mesh = element.mesh;
      const originalPosition = mesh.metadata?.originalPosition?.clone() || mesh.position.clone();
      
      if (!mesh.metadata?.originalPosition) {
        if (!mesh.metadata) mesh.metadata = {};
        mesh.metadata.originalPosition = originalPosition.clone();
      }

      // Все стартуют с ОДНОЙ высоты
      const startPosition = originalPosition.add(new Vector3(0, this.START_HEIGHT, 0));
      mesh.position = startPosition;
      
      mesh.setEnabled(true);
      mesh.isVisible = true;

      setTimeout(() => {
        const animPosition = new Animation(
          `anim_${element.name}_position`,
          "position.y",
          60,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const frames = duration / 16.67;
        
        const keys = [
          { frame: 0, value: startPosition.y },
          { frame: frames, value: originalPosition.y }
        ];
        
        animPosition.setKeys(keys);

        // Плавное замедление в конце
        const easing = new SineEase();
        easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        animPosition.setEasingFunction(easing);

        mesh.animations = [];
        mesh.animations.push(animPosition);

        this._scene.beginAnimation(mesh, 0, frames, false, 1.0, () => {
          mesh.position.y = originalPosition.y;
          resolve();
        });

      }, delay);
    });
  }

  /**
   * Сбросить все анимации
   */
  public resetAllElements(elements: BuildingElement[]): void {
    elements.forEach(element => {
      const mesh = element.mesh;
      if (mesh.metadata?.originalPosition) {
        mesh.position = mesh.metadata.originalPosition.clone();
      }
      mesh.setEnabled(true);
      mesh.isVisible = true;
    });
  }
}