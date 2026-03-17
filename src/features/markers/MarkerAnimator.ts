import { Scene, Animation, Vector3, Color3, EasingFunction, SineEase, BackEase, TransformNode } from "@babylonjs/core";
import { logger } from "../../core/logger/Logger";

const animatorLogger = logger.getLogger('MarkerAnimator');

export interface MarkerAnimationState {
  isSelected: boolean;
  isHovered: boolean;
}

export class MarkerAnimator {
  private _scene: Scene;
  private _currentAnimation: Animation | null = null;
  
  private readonly ANIMATION_SPEED = 60;
  private readonly NORMAL_SCALE = 1.0;
  private readonly HOVER_SCALE = 1.2;
  private readonly SELECTED_PEAK_SCALE = 1.8;
  private readonly SELECTED_FINAL_SCALE = 1.5;
  private readonly SELECTED_OUTLINE_COLOR = new Color3(0.3, 0.6, 1.0);

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public async playSelectionAnimation(
    node: TransformNode,
    selected: boolean
  ): Promise<void> {
    if (!node) return;

    this.stopCurrentAnimation(node);

    if (selected) {
      await this.playSelectAnimation(node);
    } else {
      await this.playDeselectAnimation(node);
    }
  }

  public playHoverAnimation(
    node: TransformNode,
    hovered: boolean,
    isSelected: boolean
  ): void {
    if (!node || isSelected) return;

    this.stopCurrentAnimation(node);

    const targetScale = hovered ? this.HOVER_SCALE : this.NORMAL_SCALE;
    
    const animScale = new Animation(
      "markerHoverAnim",
      "scaling",
      this.ANIMATION_SPEED,
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

    node.animations = [];
    node.animations.push(animScale);
    
    this._scene.beginAnimation(node, 0, 10, false);
  }

  public updateDistanceScale(
    node: TransformNode,
    distance: number,
    isSelected: boolean,
    isHovered: boolean
  ): void {
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

  public async playSpawnAnimation(node: TransformNode): Promise<void> {
    if (!node) return;

    node.scaling.setAll(0);
    
    const animScale = new Animation(
      "markerSpawnAnim",
      "scaling",
      this.ANIMATION_SPEED,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keys = [
      { frame: 0, value: new Vector3(0, 0, 0) },
      { frame: 15, value: new Vector3(1.2, 1.2, 1.2) },
      { frame: 20, value: new Vector3(1.0, 1.0, 1.0) }
    ];

    animScale.setKeys(keys);

    const easing = new BackEase(0.5);
    animScale.setEasingFunction(easing);

    node.animations = [];
    node.animations.push(animScale);
    
    return new Promise((resolve) => {
      this._scene.beginAnimation(node, 0, 20, false, 1.0, () => resolve());
    });
  }

  public async playDisappearAnimation(node: TransformNode): Promise<void> {
    if (!node) return;

    const animScale = new Animation(
      "markerDisappearAnim",
      "scaling",
      this.ANIMATION_SPEED,
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

    node.animations = [];
    node.animations.push(animScale);
    
    return new Promise((resolve) => {
      this._scene.beginAnimation(node, 0, 15, false, 1.0, () => resolve());
    });
  }

  private async playSelectAnimation(node: TransformNode): Promise<void> {
    const animScale = new Animation(
      "markerSelectAnim",
      "scaling",
      this.ANIMATION_SPEED,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keys = [
      { frame: 0, value: node.scaling.clone() },
      { frame: 15, value: new Vector3(
        this.SELECTED_PEAK_SCALE,
        this.SELECTED_PEAK_SCALE,
        this.SELECTED_PEAK_SCALE
      )},
      { frame: 25, value: new Vector3(
        this.SELECTED_FINAL_SCALE * 1.1,
        this.SELECTED_FINAL_SCALE * 1.1,
        this.SELECTED_FINAL_SCALE * 1.1
      )},
      { frame: 30, value: new Vector3(
        this.SELECTED_FINAL_SCALE,
        this.SELECTED_FINAL_SCALE,
        this.SELECTED_FINAL_SCALE
      )}
    ];

    animScale.setKeys(keys);

    const easing = new BackEase(0.5);
    animScale.setEasingFunction(easing);

    node.animations = [];
    node.animations.push(animScale);
    
    return new Promise((resolve) => {
      this._scene.beginAnimation(node, 0, 30, false, 1.0, () => resolve());
    });
  }

  private async playDeselectAnimation(node: TransformNode): Promise<void> {
    const animScale = new Animation(
      "markerDeselectAnim",
      "scaling",
      this.ANIMATION_SPEED,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keys = [
      { frame: 0, value: node.scaling.clone() },
      { frame: 15, value: new Vector3(
        this.NORMAL_SCALE,
        this.NORMAL_SCALE,
        this.NORMAL_SCALE
      )}
    ];

    animScale.setKeys(keys);

    const easing = new SineEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    animScale.setEasingFunction(easing);

    node.animations = [];
    node.animations.push(animScale);
    
    return new Promise((resolve) => {
      this._scene.beginAnimation(node, 0, 15, false, 1.0, () => resolve());
    });
  }

  private stopCurrentAnimation(node: TransformNode): void {
    if (this._currentAnimation) {
      this._scene.stopAnimation(node);
      this._currentAnimation = null;
    }
  }

  private lerp(start: number, end: number, amount: number): number {
    return start * (1 - amount) + end * amount;
  }

  public getSelectedOutlineColor(): Color3 {
    return this.SELECTED_OUTLINE_COLOR.clone();
  }
}