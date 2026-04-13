import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";
import { CameraTransform } from "../../shared/types";
import { ICameraAnimator } from "@shared/interfaces";

/**
 * Аниматор камеры
 * Плавная интерполяция параметров камеры (alpha, beta, radius, target)
 */
export class CameraAnimator implements ICameraAnimator {
    private _isAnimating = false;
    private scene?: Scene;
    private animationId: number | null = null;

    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    /**
     * Анимировать камеру к целевой позиции
     * @param camera Экземпляр камеры
     * @param target Целевая трансформация
     * @param duration Длительность в секундах
     */
    public async animateTo(
        camera: ArcRotateCamera,
        target: CameraTransform,
        duration: number = 1.0
    ): Promise<void> {
        if (this._isAnimating) this.stopAnimation();
        if (!this.scene) return;

        return new Promise((resolve) => {
            const startAlpha = camera.alpha;
            const startBeta = camera.beta;
            const startRadius = camera.radius;
            const startTarget = camera.target.clone();
            const startTime = performance.now();
            const endTime = startTime + duration * 1000;

            const animate = (now: number) => {
                if (now >= endTime) {
                    camera.alpha = target.alpha;
                    camera.beta = target.beta;
                    camera.radius = target.radius;
                    camera.target = target.target;
                    this._isAnimating = false;
                    this.animationId = null;
                    resolve();
                    return;
                }

                const t = (now - startTime) / (duration * 1000);
                const easedT = 1 - Math.pow(1 - t, 3); // easeOutCubic

                camera.alpha = startAlpha + (target.alpha - startAlpha) * easedT;
                camera.beta = startBeta + (target.beta - startBeta) * easedT;
                camera.radius = startRadius + (target.radius - startRadius) * easedT;
                camera.target = Vector3.Lerp(startTarget, target.target, easedT);

                this.animationId = requestAnimationFrame(animate);
            };

            this._isAnimating = true;
            this.animationId = requestAnimationFrame(animate);
        });
    }

    public stopAnimation(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this._isAnimating = false;
    }

    public get isAnimating(): boolean {
        return this._isAnimating;
    }

    public dispose(): void {
        this.stopAnimation();
    }
}
