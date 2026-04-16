import { Vector3 } from "@babylonjs/core";
import { CameraMode, BuildingDimensions } from "@shared/types";
import { ICameraModeManager } from "@shared/interfaces";

export class CameraModeManager implements ICameraModeManager {
  private currentMode: CameraMode = CameraMode.FREE_FLIGHT;
  private _pivotPoint: Vector3 = Vector3.Zero();
  private _currentFloor: number = -1;
  private _buildingCenter: Vector3 = Vector3.Zero();
  private _floorHeight: number = 3;
  private _viewMode: 'single' | 'all' = 'all';
  private _isFloorExpanded = false;

  public setPivotPoint(point: Vector3): void {
    this._pivotPoint = point.clone();
  }

  public getPivotPoint(): Vector3 {
    return this._pivotPoint;
  }

  public setDimensions(dimensions: BuildingDimensions): void {
    this._buildingCenter = new Vector3(0, dimensions.height / 2, 0);
  }

  public setBuildingCenter(center: Vector3): void {
    this._buildingCenter = center.clone();
  }

  public setMode(mode: CameraMode): void {
    this.currentMode = mode;
  }

  public setCurrentContext(floor: number, center: Vector3, height: number): void {
    this._currentFloor = floor;
    this._buildingCenter = center.clone();
    this._floorHeight = height;
    this._viewMode = 'single';

    // Обновляем pivot point для текущего этажа
    const y = center.y - (height / 2) + (floor * height);
    this._pivotPoint = new Vector3(center.x, y, center.z);
  }

  public setCurrentFloor(floor: number | 'all'): void {
    this._currentFloor = floor === 'all' ? -1 : floor;
  }

  public setViewMode(mode: 'single' | 'all'): void {
    this._viewMode = mode;
  }

  public setFloorExpanded(expanded: boolean): void {
    this._isFloorExpanded = expanded;
  }

  public get mode(): CameraMode {
    return this.currentMode;
  }

  public get is2DMode(): boolean {
    return this.currentMode === CameraMode.TOP_DOWN;
  }

  public get is3DMode(): boolean {
    return this.currentMode === CameraMode.ORBIT || this.currentMode === CameraMode.FREE_FLIGHT;
  }

  public get isOrbitMode(): boolean {
    return this.currentMode === CameraMode.ORBIT;
  }

  public get isFreeFlightMode(): boolean {
    return this.currentMode === CameraMode.FREE_FLIGHT;
  }

  public get pivotPoint(): Vector3 {
    return this._pivotPoint;
  }

  public get currentFloor(): number {
    return this._currentFloor;
  }

  public get buildingCenter(): Vector3 {
    return this._buildingCenter;
  }

  public get floorHeight(): number {
    return this._floorHeight;
  }

  public get viewMode(): 'single' | 'all' {
    return this._viewMode;
  }

  public get isFloorExpanded(): boolean {
    return this._isFloorExpanded;
  }

  public dispose(): void { }
}
