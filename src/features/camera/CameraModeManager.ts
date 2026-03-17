import { ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { CameraMode, CameraTransform, BuildingDimensions } from "./types";
import { CAMERA_CONFIG } from "./constants";
import { logger } from "../../core/logger/Logger";

const modeLogger = logger.getLogger('CameraModeManager');

export class CameraModeManager {
  private _currentCameraMode: CameraMode = CameraMode.MODE_3D;
  private _target: Vector3 = Vector3.Zero();
  private _saved3DState: CameraTransform | null = null;

  constructor(
    private readonly _camera: ArcRotateCamera,
    private readonly _dimensions: BuildingDimensions
  ) {
    this.setupCamera();
  }

  private setupCamera(): void {
    this._camera.angularSensibilityX = 1000;
    this._camera.angularSensibilityY = 1000;
    this._camera.panningSensibility = CAMERA_CONFIG.panningSpeed;
    this._camera.wheelPrecision = CAMERA_CONFIG.wheelPrecision;
    this._camera.pinchPrecision = CAMERA_CONFIG.pinchPrecision;
    this._camera.target = this._target;
    this.applyConstraints();
  }

  private applyConstraints(): void {
    if (this._currentCameraMode === CameraMode.MODE_2D) {
      this._camera.lowerBetaLimit = 0.1;
      this._camera.upperBetaLimit = 0.1;
      this._camera.lowerRadiusLimit = 20;
      this._camera.upperRadiusLimit = 200;
    } else {
      this._camera.lowerBetaLimit = CAMERA_CONFIG.minBeta;
      this._camera.upperBetaLimit = CAMERA_CONFIG.maxBeta;
      this._camera.lowerRadiusLimit = CAMERA_CONFIG.minRadius;
      this._camera.upperRadiusLimit = CAMERA_CONFIG.maxRadius;
    }
  }

  public setTarget(target: Vector3): void {
    this._target = target.clone();
    this._camera.target = this._target;
  }

  public get2DTransform(): CameraTransform {
    const maxDimension = Math.max(this._dimensions.height, this._dimensions.width, this._dimensions.depth);
    return {
      alpha: -Math.PI / 2,
      beta: 0.1,
      radius: maxDimension * 2.5,
      target: this._target.clone()
    };
  }

  public get3DTransform(): CameraTransform {
    const maxDimension = Math.max(this._dimensions.height, this._dimensions.width, this._dimensions.depth);
    const defaultRadius = Math.max(30, maxDimension * 2.0);
    
    return this._saved3DState ?? {
      alpha: -Math.PI / 2,
      beta: Math.PI / 3.5,
      radius: defaultRadius,
      target: this._target.clone()
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
    }

    this._currentCameraMode = this._currentCameraMode === CameraMode.MODE_3D 
      ? CameraMode.MODE_2D 
      : CameraMode.MODE_3D;

    this.applyConstraints();
    modeLogger.debug(`Режим камеры: ${this._currentCameraMode}`);
    
    return this._currentCameraMode;
  }

  public get cameraMode(): CameraMode {
    return this._currentCameraMode;
  }

  public get target(): Vector3 {
    return this._target;
  }

  public get camera(): ArcRotateCamera {
    return this._camera;
  }
}