import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { CameraTransform } from "../../shared/types";
import { CAMERA } from "../../shared/constants";
import { ICameraAnimator } from "@shared/interfaces";

@injectable()
export class CameraAnimator implements ICameraAnimator {
    private logger: Logger;
    private _isAnimating: boolean = false;
    private scene?: Scene;
    private animationId: number | null = null;

    constructor(
        @inject(TYPES.Logger) logger: Logger    ) {
        this.logger = logger.getLogger('CameraAnimator');
    }

    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    public async animateTo(
        camera: ArcRotateCamera,
        target: CameraTransform,
        duration: number = 1.0
    ): Promise<void> {
        if (this._isAnimating) {
            this.stopAnimation();
        }
        if (!this.scene) {
            this.logger.error('Scene not set');
            return;
        }

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
                const easedT = 1 - Math.pow(1 - t, 3);
                
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

    public async playIntroAnimation(
        camera: ArcRotateCamera,
        targetPosition: Vector3,
        buildingHeight: number,
        duration: number = CAMERA.INTRO_DURATION,
        customStart?: CameraTransform,
        customEnd?: CameraTransform
    ): Promise<void> {
        this.logger.info(`Playing intro animation, building height: ${buildingHeight}`);

        const start: CameraTransform = customStart ?? {
            alpha: CAMERA.INTRO_ALPHA,
            beta: CAMERA.INTRO_BETA,
            radius: Math.max(30, buildingHeight * CAMERA.INTRO_RADIUS_MULTIPLIER),
            target: targetPosition.clone()
        };

        const end: CameraTransform = customEnd ?? {
            alpha: CAMERA.FINAL_ALPHA,
            beta: CAMERA.FINAL_BETA,
            radius: Math.max(CAMERA.FINAL_RADIUS_MIN, buildingHeight * CAMERA.FINAL_RADIUS_MULTIPLIER),
            target: targetPosition.clone()
        };

        this.logger.debug(`Start: alpha=${start.alpha.toFixed(3)}, beta=${start.beta.toFixed(3)}, radius=${start.radius.toFixed(1)}`);
        this.logger.debug(`End: alpha=${end.alpha.toFixed(3)}, beta=${end.beta.toFixed(3)}, radius=${end.radius.toFixed(1)}`);

        camera.alpha = start.alpha;
        camera.beta = start.beta;
        camera.radius = start.radius;
        camera.target = start.target;

        await this.animateTo(camera, end, duration);
        
        this.logger.info('Intro animation complete');
    }

    public async animateZoom(
        camera: ArcRotateCamera,
        targetRadius: number,
        duration: number = 0.2
    ): Promise<void> {
        if (this._isAnimating) return;

        return new Promise((resolve) => {
            const startRadius = camera.radius;
            const startTime = performance.now();
            
            const animate = (now: number) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                const easedT = 1 - Math.pow(1 - t, 3);
                
                camera.radius = startRadius + (targetRadius - startRadius) * easedT;
                
                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    camera.radius = targetRadius;
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
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