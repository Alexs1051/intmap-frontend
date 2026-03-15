import { ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { CameraMode, CameraTransform, BuildingBounds } from "./types";

export class CameraModeManager {
  private _camera: ArcRotateCamera;
  private _currentCameraMode: CameraMode = CameraMode.MODE_3D;
  private _bounds: BuildingBounds = {
    minY: 0,
    maxY: 30,
    center: Vector3.Zero()
  };

  // Сохранённые состояния
  private _saved3DState: CameraTransform | null = null;
  private _saved2DState: CameraTransform | null = null;

  constructor(camera: ArcRotateCamera) {
    this._camera = camera;
    this.setupCamera();
  }

  private setupCamera(): void {
    this._camera.alpha = -Math.PI / 2;
    this._camera.beta = Math.PI / 3;
    this._camera.radius = 40;
    this._camera.target = Vector3.Zero();
    
    this._camera.angularSensibilityX = 1000;
    this._camera.angularSensibilityY = 1000;
    this._camera.panningSensibility = 50;
    this._camera.wheelPrecision = 10;
    this._camera.pinchPrecision = 10;
    
    this.applyConstraints();
  }

  private applyConstraints(): void {
    if (this._currentCameraMode === CameraMode.MODE_2D) {
      this._camera.lowerBetaLimit = 0.1;
      this._camera.upperBetaLimit = 0.1;
      this._camera.lowerAlphaLimit = -Infinity;
      this._camera.upperAlphaLimit = Infinity;
      this._camera.lowerRadiusLimit = 10;
      this._camera.upperRadiusLimit = 100;
    } else {
      this._camera.lowerBetaLimit = 0.1;
      this._camera.upperBetaLimit = Math.PI / 2;
      this._camera.lowerAlphaLimit = -Infinity;
      this._camera.upperAlphaLimit = Infinity;
      this._camera.lowerRadiusLimit = 2;
      this._camera.upperRadiusLimit = 50;
    }
  }

  public setBuildingBounds(bounds: BuildingBounds): void {
    this._bounds = bounds;
    this._camera.target = bounds.center.clone();
  }

  public get2DTransform(): CameraTransform {
    const height = this._bounds.maxY + 20;
    
    return {
      alpha: -Math.PI / 2,
      beta: 0.1,
      radius: height,
      target: this._bounds.center.clone()
    };
  }

  public get3DTransform(): CameraTransform {
    if (this._saved3DState) {
      return this._saved3DState;
    }
    
    return {
      alpha: -Math.PI / 2,
      beta: Math.PI / 3,
      radius: this._bounds.maxY * 1.2,
      target: this._bounds.center.clone()
    };
  }

  public toggleCameraMode(): CameraMode {
    if (this._currentCameraMode === CameraMode.MODE_3D) {
      this._saved3DState = {
        alpha: this._camera.alpha,
        beta: this._camera.beta,
        radius: this._camera.radius,
        target: this._camera.target.clone()
      };
    } else {
      this._saved2DState = {
        alpha: this._camera.alpha,
        beta: this._camera.beta,
        radius: this._camera.radius,
        target: this._camera.target.clone()
      };
    }

    this._currentCameraMode = this._currentCameraMode === CameraMode.MODE_3D 
      ? CameraMode.MODE_2D 
      : CameraMode.MODE_3D;

    this.applyConstraints();
    
    console.log(`Camera mode switched to: ${this._currentCameraMode}`);
    return this._currentCameraMode;
  }

  // Геттеры
  public get cameraMode(): CameraMode {
    return this._currentCameraMode;
  }

  public get bounds(): BuildingBounds {
    return this._bounds;
  }

  public get camera(): ArcRotateCamera {
    return this._camera;
  }
}