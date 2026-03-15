import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";
import { CameraTransform, AnimationConfig, EasingFunctions, BuildingBounds } from "./types";

export class CameraAnimator {
  private _camera: ArcRotateCamera;
  private _scene: Scene;
  private _isAnimating: boolean = false;

  constructor(camera: ArcRotateCamera, scene: Scene) {
    this._camera = camera;
    this._scene = scene;
  }

  public async animateTo(
    target: CameraTransform,
    duration: number = 1.0
  ): Promise<void> {
    if (this._isAnimating) return;

    const start: CameraTransform = {
      alpha: this._camera.alpha,
      beta: this._camera.beta,
      radius: this._camera.radius,
      target: this._camera.target.clone()
    };

    let elapsed = 0;
    this._isAnimating = true;

    return new Promise((resolve) => {
      const observer = this._scene.onBeforeRenderObservable.add(() => {
        elapsed += this._scene.getEngine().getDeltaTime() / 1000;

        if (elapsed >= duration) {
          this._camera.alpha = target.alpha;
          this._camera.beta = target.beta;
          this._camera.radius = target.radius;
          this._camera.target.copyFrom(target.target);

          this._scene.onBeforeRenderObservable.remove(observer);
          this._isAnimating = false;
          resolve();
          return;
        }

        const t = EasingFunctions.easeOutCubic(elapsed / duration);
        
        this._camera.alpha = this.lerp(start.alpha, target.alpha, t);
        this._camera.beta = this.lerp(start.beta, target.beta, t);
        this._camera.radius = this.lerp(start.radius, target.radius, t);
        
        const targetPos = Vector3.Lerp(start.target, target.target, t);
        this._camera.target.copyFrom(targetPos);
      });
    });
  }

  /**
   * Анимация выезда камеры при загрузке
   */
  public async playIntroAnimation(
    bounds: BuildingBounds,
    customStart?: CameraTransform,
    customEnd?: CameraTransform
  ): Promise<void> {
    // Центр здания по высоте - на уровне 1/3 от низа
    const targetHeight = bounds.maxY * 0.3;
    
    const start: CameraTransform = customStart ?? {
      alpha: Math.PI / 4,
      beta: Math.PI / 4,
      radius: bounds.maxY * 1.2,
      target: new Vector3(0, targetHeight, 0)
    };

    const end: CameraTransform = customEnd ?? {
      alpha: -Math.PI / 3,
      beta: Math.PI / 3.5,
      radius: bounds.maxY * 0.9,
      target: new Vector3(0, targetHeight, 0)
    };

    // Устанавливаем начальную позицию без анимации
    this._camera.alpha = start.alpha;
    this._camera.beta = start.beta;
    this._camera.radius = start.radius;
    this._camera.target.copyFrom(start.target);

    // Анимируем к конечной
    await this.animateTo(end, 2.0);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public get isAnimating(): boolean {
    return this._isAnimating;
  }
}