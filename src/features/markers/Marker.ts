import { Scene, Vector3, Mesh, Ray, TransformNode, ActionManager, SetValueAction } from "@babylonjs/core";
import { MarkerWidget } from "./components/MarkerWidget";
import { MarkerAnimator } from "./MarkerAnimator";
import { MarkerData, MarkerType } from "./types";
import { MARKER_CONFIG } from "../../shared/constants";
import { logger } from "../../core/logger/Logger";

const markerLogger = logger.getLogger('Marker');

export class Marker {
  private readonly _id: string;
  private readonly _type: MarkerType;
  private readonly _widget: MarkerWidget;
  private readonly _data: MarkerData;
  private readonly _animator: MarkerAnimator;
  
  private _isSelected: boolean = false;
  private _isHovered: boolean = false;

  public onClick: (marker: Marker) => void = () => {};
  public onDoubleClick: (marker: Marker) => void = () => {};

  constructor(scene: Scene, data: MarkerData) {
    this._id = data.id;
    this._type = data.type;
    this._data = data;
    this._animator = new MarkerAnimator(scene);
    
    this._widget = new MarkerWidget(
      scene,
      data.position,
      data.backgroundColor,
      data.foregroundColor,
      data.icon || "📍",
      data.title || "",
      data.size || MARKER_CONFIG.defaultSize
    );

    this.setupInteractivity(scene);
    this.playSpawnAnimation();
  }

  private setupInteractivity(scene: Scene): void {
    const mesh = this._widget.mesh;
    if (!mesh) return;

    mesh.isPickable = true;
    mesh.enablePointerMoveEvents = true;
    
    mesh.actionManager = new ActionManager(scene);
    
    mesh.actionManager.registerAction(
      new SetValueAction(
        ActionManager.OnPointerOverTrigger,
        document.body,
        'style.cursor',
        'pointer'
      )
    );
    
    mesh.actionManager.registerAction(
      new SetValueAction(
        ActionManager.OnPointerOutTrigger,
        document.body,
        'style.cursor',
        'default'
      )
    );
  }

  private async playSpawnAnimation(): Promise<void> {
    const root = this._widget.root;
    if (root) {
      await this._animator.playSpawnAnimation(root);
    }
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
    
    // Просто меняем яркость фона, outlineColor больше не нужен
    this._widget.setSelected(selected);
    
    const root = this._widget.root;
    if (root) {
      this._animator.playSelectionAnimation(root, selected)
        .catch(err => markerLogger.error('Ошибка анимации выделения', err));
    }
  }

  public setHovered(hovered: boolean): void {
    if (this._isHovered === hovered) return;
    
    this._isHovered = hovered;
    
    const root = this._widget.root;
    if (root) {
      this._animator.playHoverAnimation(root, hovered, this._isSelected);
    }
  }

  public intersects(ray: Ray): boolean {
    try {
      const markerPos = this.position;
      const toMarker = markerPos.subtract(ray.origin);
      const t = Vector3.Dot(toMarker, ray.direction);
      
      if (t < 0) return false;
      
      const closestPoint = ray.origin.add(ray.direction.scale(t));
      const distance = Vector3.Distance(markerPos, closestPoint);
      const actualSize = this._widget.scale * (this._isSelected ? 2.0 : 1.0);
      
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
    return this._widget.position.clone();
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

  public get isHovered(): boolean {
    return this._isHovered;
  }

  public get root(): TransformNode | null {
    return this._widget.root;
  }

  public get mesh(): Mesh {
    return this._widget.mesh;
  }
}