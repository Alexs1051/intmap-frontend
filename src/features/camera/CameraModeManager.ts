import { Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { CameraMode, CameraTransform, BuildingDimensions } from "../../shared/types";
import { ICameraModeManager } from "@shared/interfaces";

@injectable()
export class CameraModeManager implements ICameraModeManager {
  private readonly logger: Logger;
  private currentMode: CameraMode = CameraMode.ORBIT;
  private _pivotPoint: Vector3 = Vector3.Zero();
  private dimensions: BuildingDimensions = { height: 30, width: 30, depth: 30 };

  constructor(@inject(TYPES.Logger) logger: Logger) {
    this.logger = logger.getLogger('CameraModeManager');
  }

  public setPivotPoint(point: Vector3): void {
    this._pivotPoint = point.clone();
  }

  public getPivotPoint(): Vector3 {
    return this._pivotPoint;
  }

  public setDimensions(dimensions: BuildingDimensions): void {
    this.dimensions = dimensions;
  }

  public getInitialTransform(): CameraTransform {
    const maxDimension = this.getMaxDimension();
    return {
      alpha: -Math.PI / 1.5,
      beta: Math.PI / 2.5,
      radius: maxDimension * 3.5,
      target: this._pivotPoint.clone()
    };
  }

  public getResetTransform(): CameraTransform {
    const maxDimension = this.getMaxDimension();
    return {
      alpha: -Math.PI / 2,
      beta: Math.PI / 3.5,
      radius: Math.max(30, maxDimension * 2),
      target: this._pivotPoint.clone()
    };
  }

  public getFocusTransform(point: Vector3, currentAlpha: number, currentBeta: number, distance: number): CameraTransform {
    this._pivotPoint = point.clone();
    return {
      alpha: currentAlpha,
      beta: currentBeta,
      radius: distance,
      target: point.clone()
    };
  }

  public get2DTransform(currentAlpha: number, currentRadius: number): CameraTransform {
    const maxDimension = this.getMaxDimension();
    return {
      alpha: currentAlpha,
      beta: 0.01,
      radius: Math.max(currentRadius, maxDimension * 2.5),
      target: this._pivotPoint.clone()
    };
  }

  public get3DTransform(currentAlpha: number, currentBeta: number, currentRadius: number): CameraTransform {
    const maxDimension = this.getMaxDimension();
    const targetBeta = this.is2DMode ? Math.PI / 3.5 : currentBeta;
    
    return {
      alpha: currentAlpha,
      beta: targetBeta,
      radius: Math.max(currentRadius, maxDimension * 2),
      target: this._pivotPoint.clone()
    };
  }

  public getConstraints(): { minBeta: number; maxBeta: number; minRadius: number } {
    if (this.is2DMode) {
      return { minBeta: 0.005, maxBeta: 0.05, minRadius: 15 };
    }
    return { minBeta: 0.1, maxBeta: Math.PI / 2, minRadius: 5 };
  }

  public setMode(mode: CameraMode): void {
    this.currentMode = mode;
    this.logger.debug(`Camera mode set to: ${mode}`);
  }

  private getMaxDimension(): number {
    return Math.max(this.dimensions.height, this.dimensions.width, this.dimensions.depth);
  }

  // Публичные геттеры для интерфейса
  public get mode(): CameraMode {
    return this.currentMode;
  }

  public get is2DMode(): boolean {
    return this.currentMode === CameraMode.TOP_DOWN;
  }

  public get is3DMode(): boolean {
    return this.currentMode === CameraMode.ORBIT;
  }

  public get pivotPoint(): Vector3 {
    return this._pivotPoint;
  }

  public dispose(): void {
    this.logger.info('CameraModeManager disposed');
  }
}