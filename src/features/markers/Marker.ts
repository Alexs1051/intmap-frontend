import { Scene, Vector3, Mesh, Ray, TransformNode, ActionManager, SetValueAction, Color3 } from "@babylonjs/core";
import { MarkerWidget } from "./components/MarkerWidget";
import { MarkerAnimator } from "./MarkerAnimator";
import { AnyMarkerData, MarkerType, RGBA } from "./types";
import { MARKER_CONFIG } from "../../shared/constants";
import { logger } from "../../core/logger/Logger";

const markerLogger = logger.getLogger('Marker');

export class Marker {
  private readonly _id: string;
  private readonly _type: MarkerType;
  private readonly _widget: MarkerWidget;
  private readonly _data: AnyMarkerData;
  private readonly _animator: MarkerAnimator;
  
  private _isSelected: boolean = false;
  private _isHovered: boolean = false;

  public onClick: (marker: Marker) => void = () => {};
  public onDoubleClick: (marker: Marker) => void = () => {};

  constructor(scene: Scene, data: AnyMarkerData) {
    this._id = data.id;
    this._type = data.type;
    this._data = data;
    this._animator = new MarkerAnimator(scene);
    
    // Выбираем размер в зависимости от типа
    let size: number = MARKER_CONFIG.defaultSize;
    if (this._type === MarkerType.WAYPOINT) {
      size = MARKER_CONFIG.waypointSize;
    } else if (this._type === MarkerType.FLAG) {
      size = MARKER_CONFIG.flagSize;
    }

    // Используем backgroundColor и textColor (вместо foregroundColor)
    this._widget = new MarkerWidget(
      scene,
      data.position,
      data.backgroundColor, // RGBA
      data.textColor,       // RGBA
      this._type,
      data.iconName,
      data.name,
      size
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

  public hasQR(): boolean {
    return this._type === MarkerType.FLAG && 'qr' in this._data;
  }

  public getQR(): string | undefined {
    return this._type === MarkerType.FLAG ? (this._data as any).qr : undefined;
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

  public get data(): AnyMarkerData {
    return this._data;
  }

  public get name(): string {
    return this._data.name;
  }

  public get iconName(): string {
    return this._data.iconName;
  }

  public get floor(): number {
    return this._data.floor;
  }

  public get backgroundColor(): RGBA {
    return this._data.backgroundColor;
  }

  public get textColor(): RGBA {
    return this._data.textColor;
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

  public setVisible(visible: boolean): void {
    this._widget.setVisible(visible);
  }
}