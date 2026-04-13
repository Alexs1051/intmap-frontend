import { Scene, Animation, Vector3, Color3, EasingFunction, SineEase, BackEase, TransformNode } from "@babylonjs/core";
import { Logger } from "@core/logger/logger";
import { IMarkerAnimatorConfig } from "@shared/types";

const DEFAULT_CONFIG: IMarkerAnimatorConfig = {
    animationSpeed: 60,
    normalScale: 1.0,
    hoverScale: 1.2,
    selectedPeakScale: 1.8,
    selectedFinalScale: 1.5,
    spawnPeakScale: 1.2,
    selectedOutlineColor: { r: 0.3, g: 0.6, b: 1.0 }
};

/**
 * Аниматор маркеров
 */
export class MarkerAnimator {
    private logger: Logger;
    private config: IMarkerAnimatorConfig;
    private scene?: Scene;
    private activeAnimations: Map<TransformNode, Animation> = new Map();
    private _isAnimating: boolean = false;

    constructor(logger: Logger) {
        this.logger = logger.getLogger('MarkerAnimator');
        this.config = DEFAULT_CONFIG;
    }

    /**
     * Установить сцену
     */
    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    /**
     * Анимация выделения маркера
     */
    public async playSelectionAnimation(node: TransformNode, selected: boolean): Promise<void> {
        if (!node || !this.scene) return;

        this._isAnimating = true;
        this.stopCurrentAnimation(node);

        if (selected) {
            await this.playSelectAnimation(node);
        } else {
            await this.playDeselectAnimation(node);
        }

        this._isAnimating = false;
    }

    /**
     * Проверка, идет ли анимация
     */
    public isAnimating(): boolean {
        return this._isAnimating;
    }

    /**
     * Анимация наведения
     */
    public playHoverAnimation(node: TransformNode, hovered: boolean, isSelected: boolean): void {
        if (!node || !this.scene || isSelected) return;

        this.stopCurrentAnimation(node);

        const targetScale = hovered ? this.config.hoverScale : this.config.normalScale;

        const animScale = new Animation(
            "markerHoverAnim",
            "scaling",
            this.config.animationSpeed,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [
            { frame: 0, value: node.scaling.clone() },
            { frame: 10, value: new Vector3(targetScale, targetScale, targetScale) }
        ];

        animScale.setKeys(keys);

        const easing = new SineEase();
        easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        animScale.setEasingFunction(easing);

        node.animations = [animScale];
        this.activeAnimations.set(node, animScale);

        this.scene.beginAnimation(node, 0, 10, false);
    }

    /**
     * Анимация масштабирования по расстоянию
     */
    public updateDistanceScale(node: TransformNode, distance: number, isSelected: boolean, isHovered: boolean): void {
        if (isSelected || isHovered || !node) return;

        const OPTIMAL_DISTANCE = 20;
        const MIN_SCALE = 0.5;
        const MAX_SCALE = 2.5;

        let targetScale = distance / OPTIMAL_DISTANCE;
        targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

        const currentScale = node.scaling.x;
        const newScale = this.lerp(currentScale, targetScale, 0.1);

        node.scaling.setAll(newScale);
    }

    /**
     * Анимация появления
     */
    public async playSpawnAnimation(node: TransformNode): Promise<void> {
        if (!node || !this.scene) return;

        node.scaling.setAll(0);

        const animScale = new Animation(
            "markerSpawnAnim",
            "scaling",
            this.config.animationSpeed,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [
            { frame: 0, value: new Vector3(0, 0, 0) },
            { frame: 15, value: new Vector3(this.config.spawnPeakScale, this.config.spawnPeakScale, this.config.spawnPeakScale) },
            { frame: 20, value: new Vector3(this.config.normalScale, this.config.normalScale, this.config.normalScale) }
        ];

        animScale.setKeys(keys);

        const easing = new BackEase(0.5);
        animScale.setEasingFunction(easing);

        node.animations = [animScale];
        this.activeAnimations.set(node, animScale);

        return new Promise((resolve) => {
            this.scene?.beginAnimation(node, 0, 20, false, 1.0, () => resolve());
        });
    }

    /**
     * Анимация исчезновения
     */
    public async playDisappearAnimation(node: TransformNode): Promise<void> {
        if (!node || !this.scene) return;

        const animScale = new Animation(
            "markerDisappearAnim",
            "scaling",
            this.config.animationSpeed,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [
            { frame: 0, value: node.scaling.clone() },
            { frame: 15, value: new Vector3(0, 0, 0) }
        ];

        animScale.setKeys(keys);

        const easing = new SineEase();
        easing.setEasingMode(EasingFunction.EASINGMODE_EASEIN);
        animScale.setEasingFunction(easing);

        node.animations = [animScale];
        this.activeAnimations.set(node, animScale);

        return new Promise((resolve) => {
            this.scene?.beginAnimation(node, 0, 15, false, 1.0, () => resolve());
        });
    }

    /**
     * Анимация выделения
     */
    private async playSelectAnimation(node: TransformNode): Promise<void> {
        const animScale = new Animation(
            "markerSelectAnim",
            "scaling",
            this.config.animationSpeed,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [
            { frame: 0, value: node.scaling.clone() },
            { frame: 15, value: new Vector3(this.config.selectedPeakScale, this.config.selectedPeakScale, this.config.selectedPeakScale) },
            { frame: 25, value: new Vector3(this.config.selectedFinalScale * 1.1, this.config.selectedFinalScale * 1.1, this.config.selectedFinalScale * 1.1) },
            { frame: 30, value: new Vector3(this.config.selectedFinalScale, this.config.selectedFinalScale, this.config.selectedFinalScale) }
        ];

        animScale.setKeys(keys);

        const easing = new BackEase(0.5);
        animScale.setEasingFunction(easing);

        node.animations = [animScale];
        this.activeAnimations.set(node, animScale);

        return new Promise((resolve) => {
            this.scene?.beginAnimation(node, 0, 30, false, 1.0, () => resolve());
        });
    }

    /**
     * Анимация снятия выделения
     */
    private async playDeselectAnimation(node: TransformNode): Promise<void> {
        const animScale = new Animation(
            "markerDeselectAnim",
            "scaling",
            this.config.animationSpeed,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [
            { frame: 0, value: node.scaling.clone() },
            { frame: 15, value: new Vector3(this.config.normalScale, this.config.normalScale, this.config.normalScale) }
        ];

        animScale.setKeys(keys);

        const easing = new SineEase();
        easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        animScale.setEasingFunction(easing);

        node.animations = [animScale];
        this.activeAnimations.set(node, animScale);

        return new Promise((resolve) => {
            this.scene?.beginAnimation(node, 0, 15, false, 1.0, () => resolve());
        });
    }

    /**
     * Остановить текущую анимацию
     */
    private stopCurrentAnimation(node: TransformNode): void {
        const anim = this.activeAnimations.get(node);
        if (anim && this.scene) {
            this.scene.stopAnimation(node);
            this.activeAnimations.delete(node);
        }
    }

    /**
     * Остановить все анимации
     */
    public stopAllAnimations(): void {
        this.activeAnimations.forEach((_, node) => {
            if (this.scene) {
                this.scene.stopAnimation(node);
            }
        });
        this.activeAnimations.clear();
    }

    private lerp(start: number, end: number, amount: number): number {
        return start * (1 - amount) + end * amount;
    }

    public getSelectedOutlineColor(): Color3 {
        const color = this.config.selectedOutlineColor;
        if (color && typeof color.r === 'number' && typeof color.g === 'number' && typeof color.b === 'number') {
            return new Color3(color.r, color.g, color.b);
        }
        return new Color3(0.3, 0.6, 1.0);
    }

    public dispose(): void {
        this.stopAllAnimations();
        this.logger.info("MarkerAnimator disposed");
    }
}