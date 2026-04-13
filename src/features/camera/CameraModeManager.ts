import { Vector3 } from "@babylonjs/core";
import { CameraMode, BuildingDimensions } from "../../shared/types";
import { ICameraModeManager } from "@shared/interfaces";

/**
 * Менеджер режимов камеры (3D орбита / 2D вид сверху)
 * Хранит текущий режим, точку привязки и ограничения камеры
 */
export class CameraModeManager implements ICameraModeManager {
  private currentMode: CameraMode = CameraMode.ORBIT;
  private _pivotPoint: Vector3 = Vector3.Zero();

  public setPivotPoint(point: Vector3): void {
    this._pivotPoint = point.clone();
  }

  public getPivotPoint(): Vector3 {
    return this._pivotPoint;
  }

  public setDimensions(_dimensions: BuildingDimensions): void { }

  public setMode(mode: CameraMode): void {
    this.currentMode = mode;
  }

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

  public dispose(): void { }
}
