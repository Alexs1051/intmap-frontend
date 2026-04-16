import { ArcRotateCamera, Scene, Vector3, UniversalCamera } from "@babylonjs/core";
import { CameraTransform } from "@shared/types";
import { ICameraAnimator } from "@shared/interfaces";
import { EASING_FUNCTIONS } from "@shared/constants";

/**
 * Аниматор камеры
 * Поддерживает плавную интерполяцию параметров для ArcRotateCamera и UniversalCamera
 */
export class CameraAnimator implements ICameraAnimator {
    private _isAnimating = false;
    private scene?: Scene;
    private animationId: number | null = null;

    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    /**
     * Универсальный метод анимации для любой камеры
     * @param camera Экземпляр камеры (ArcRotateCamera или UniversalCamera)
     * @param targetTransform Целевая трансформация
     * @param duration Длительность в секундах
     * @param onProgress Колбэк прогресса анимации
     */
    public async animateCamera(
        camera: ArcRotateCamera | UniversalCamera,
        targetTransform: Partial<CameraTransform> | { position?: Vector3; target?: Vector3 },
        duration: number = 0.8,
        onProgress?: (progress: number) => void
    ): Promise<void> {
        if (this._isAnimating) this.stopAnimation();
        if (!this.scene) return;

        return new Promise((resolve) => {
            const startState = this.getCameraState(camera);
            const endState = this.getEndState(startState, targetTransform);
            const startTime = performance.now();
            const durationMs = duration * 1000;

            const animate = (now: number) => {
                const elapsed = now - startTime;
                let t = Math.min(1, elapsed / durationMs);

                // Используем плавное easing
                const easedT = EASING_FUNCTIONS.EASE_OUT_CUBIC(t);

                this.interpolateCamera(camera, startState, endState, easedT);

                if (onProgress) {
                    onProgress(t);
                }

                if (t < 1) {
                    this.animationId = requestAnimationFrame(animate);
                } else {
                    this._isAnimating = false;
                    this.animationId = null;
                    resolve();
                }
            };

            this._isAnimating = true;
            this.animationId = requestAnimationFrame(animate);
        });
    }

    /**
     * Анимация для ArcRotateCamera (сохраняем совместимость со старым кодом)
     */
    public async animateTo(
        camera: ArcRotateCamera,
        target: CameraTransform,
        duration: number = 1.0
    ): Promise<void> {
        return this.animateCamera(camera, target, duration);
    }

    /**
     * Анимация позиции для UniversalCamera
     * @param camera Камера свободного полёта
     * @param targetPosition Целевая позиция
     * @param targetTarget Целевая точка обзора (опционально)
     * @param duration Длительность в секундах
     */
    public async animatePosition(
        camera: UniversalCamera,
        targetPosition: Vector3,
        targetTarget?: Vector3,
        duration: number = 0.8
    ): Promise<void> {
        if (this._isAnimating) this.stopAnimation();
        if (!this.scene) return;

        return new Promise((resolve) => {
            const startPosition = camera.position.clone();
            const startTarget = camera.getTarget().clone();
            const endPosition = targetPosition.clone();
            const endTarget = targetTarget ? targetTarget.clone() : startTarget;
            const startTime = performance.now();
            const durationMs = duration * 1000;

            const animate = (now: number) => {
                const elapsed = now - startTime;
                let t = Math.min(1, elapsed / durationMs);
                const easedT = EASING_FUNCTIONS.EASE_OUT_CUBIC(t);

                camera.position = Vector3.Lerp(startPosition, endPosition, easedT);
                camera.setTarget(Vector3.Lerp(startTarget, endTarget, easedT));

                if (t < 1) {
                    this.animationId = requestAnimationFrame(animate);
                } else {
                    this._isAnimating = false;
                    this.animationId = null;
                    resolve();
                }
            };

            this._isAnimating = true;
            this.animationId = requestAnimationFrame(animate);
        });
    }

    /**
     * Получить текущее состояние камеры
     */
    private getCameraState(camera: ArcRotateCamera | UniversalCamera): any {
        if (camera instanceof ArcRotateCamera) {
            return {
                type: 'orbit',
                alpha: camera.alpha,
                beta: camera.beta,
                radius: camera.radius,
                target: camera.target.clone()
            };
        } else {
            return {
                type: 'flight',
                position: camera.position.clone(),
                target: camera.getTarget().clone()
            };
        }
    }

    /**
     * Получить конечное состояние на основе начального и целевых параметров
     */
    private getEndState(startState: any, targetTransform: any): any {
        if (startState.type === 'orbit') {
            return {
                type: 'orbit',
                alpha: targetTransform.alpha ?? startState.alpha,
                beta: targetTransform.beta ?? startState.beta,
                radius: targetTransform.radius ?? startState.radius,
                target: targetTransform.target ?? startState.target.clone()
            };
        } else {
            return {
                type: 'flight',
                position: targetTransform.position ?? startState.position.clone(),
                target: targetTransform.target ?? startState.target.clone()
            };
        }
    }

    /**
     * Интерполяция камеры между состояниями
     */
    private interpolateCamera(
        camera: ArcRotateCamera | UniversalCamera,
        startState: any,
        endState: any,
        t: number
    ): void {
        if (camera instanceof ArcRotateCamera) {
            camera.alpha = startState.alpha + (endState.alpha - startState.alpha) * t;
            camera.beta = startState.beta + (endState.beta - startState.beta) * t;
            camera.radius = startState.radius + (endState.radius - startState.radius) * t;
            camera.target = Vector3.Lerp(startState.target, endState.target, t);
        } else {
            camera.position = Vector3.Lerp(startState.position, endState.position, t);
            camera.setTarget(Vector3.Lerp(startState.target, endState.target, t));
        }
    }

    /**
     * Анимация с последовательностью шагов (например, отдаление -> перемещение -> приближение)
     * @param camera Камера
     * @param steps Массив шагов анимации
     */
    public async animateSequence(
        camera: ArcRotateCamera | UniversalCamera,
        steps: Array<{
            transform: Partial<CameraTransform> | { position?: Vector3; target?: Vector3 };
            duration: number;
        }>
    ): Promise<void> {
        for (const step of steps) {
            await this.animateCamera(camera, step.transform, step.duration);
        }
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
        this.scene = undefined;
    }
}