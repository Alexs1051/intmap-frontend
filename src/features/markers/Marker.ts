import { Scene, Vector3, Mesh, Ray } from "@babylonjs/core";
import { MarkerWidget } from "./components/MarkerWidget";
import { MarkerData, MarkerType } from "./types";
import { MARKER_CONFIG } from "../../shared/constants";

export class Marker {
  private readonly _id: string;
  private readonly _type: MarkerType;
  private readonly _widget: MarkerWidget;
  private readonly _data: MarkerData;
  private _isSelected: boolean = false;

  public onClick: (marker: Marker) => void = () => {};
  public onDoubleClick: (marker: Marker) => void = () => {};

  constructor(scene: Scene, data: MarkerData) {
    this._id = data.id;
    this._type = data.type;
    this._data = data;
    this._widget = new MarkerWidget(
      scene,
      data.position,
      data.backgroundColor,
      data.foregroundColor,
      data.icon || "📍",
      data.title || "",
      data.size || MARKER_CONFIG.defaultSize
    );
  }

  public update(cameraPosition: Vector3): void {
    this._widget.updateBillboard(cameraPosition);
  }

  public updateScale(cameraPosition: Vector3): void {
    this._widget.updateScale(cameraPosition);
  }

  public handleClick(): void {
    this.onClick(this);
  }

  public handleDoubleClick(): void {
    this.onDoubleClick(this);
  }

  public setSelected(selected: boolean): void {
    if (this._isSelected === selected) return;
    this._isSelected = selected;
    this._widget.setSelected(selected, MARKER_CONFIG.selectedOutlineColor);
  }

  public intersects(ray: Ray): boolean {
    try {
      const markerPos = this._widget.position;
      const toMarker = markerPos.subtract(ray.origin);
      const t = Vector3.Dot(toMarker, ray.direction);
      
      if (t < 0) return false;
      
      const closestPoint = ray.origin.add(ray.direction.scale(t));
      const distance = Vector3.Distance(markerPos, closestPoint);
      const actualSize = MARKER_CONFIG.defaultSize * this._widget.scale;
      
      return distance < actualSize;
    } catch {
      return false;
    }
  }

  public intersectsWithScene(scene: Scene, ray: Ray): boolean {
    try {
      const pickResult = scene.pickWithRay(ray, (mesh) => mesh.parent === this._widget.root);
      return pickResult?.hit || false;
    } catch {
      return false;
    }
  }

  public get position(): Vector3 {
    return this._widget.position;
  }

  public get id(): string {
    return this._id;
  }

  public get type(): MarkerType {
    return this._type;
  }

  public get data(): MarkerData {
    return this._data;
  }

  public get isSelected(): boolean {
    return this._isSelected;
  }

  public get root(): any {
    return this._widget.root;
  }

  public get mesh(): Mesh {
    return this._widget.mesh;
  }
}