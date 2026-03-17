import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";
import { CameraTransform } from "./types";
import { logger } from "../../core/logger/Logger";

const animatorLogger = logger.getLogger('CameraAnimator');

export class CameraAnimator {
  private _isAnimating: boolean = false;

  constructor(
    private readonly _camera: ArcRotateCamera,
    private readonly _scene: Scene
  ) {}

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
          this.applyTransform(target);
          this._scene.onBeforeRenderObservable.remove(observer);
          this._isAnimating = false;
          resolve();
          return;
        }

        const t = this.easeOutCubic(elapsed / duration);
        this.interpolateTransform(start, target, t);
      });
    });
  }

  public async playIntroAnimation(
    buildingHeight: number,
    targetPosition: Vector3,
    customStart?: CameraTransform,
    customEnd?: CameraTransform
  ): Promise<void> {
    const targetHeight = targetPosition.y;
    
    const start: CameraTransform = customStart ?? {
      alpha: Math.PI / 4,
      beta: Math.PI / 4,
      radius: buildingHeight * 1.5,
      target: targetPosition.clone()
    };

    const end: CameraTransform = customEnd ?? {
      alpha: -Math.PI / 3,
      beta: Math.PI / 3.5,
      radius: buildingHeight * 1.2,
      target: targetPosition.clone()
    };

    this.applyTransform(start);
    await this.animateTo(end, 2.0);
  }

  private applyTransform(transform: CameraTransform): void {
    this._camera.alpha = transform.alpha;
    this._camera.beta = transform.beta;
    this._camera.radius = transform.radius;
    this._camera.target.copyFrom(transform.target);
  }

  private interpolateTransform(
    start: CameraTransform,
    target: CameraTransform,
    t: number
  ): void {
    this._camera.alpha = this.lerp(start.alpha, target.alpha, t);
    this._camera.beta = this.lerp(start.beta, target.beta, t);
    this._camera.radius = this.lerp(start.radius, target.radius, t);
    this._camera.target.copyFrom(Vector3.Lerp(start.target, target.target, t));
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public get isAnimating(): boolean {
    return this._isAnimating;
  }
}