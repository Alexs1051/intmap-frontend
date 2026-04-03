import { Scene, Vector3, Mesh, ActionManager, SetValueAction, Color3, ExecuteCodeAction } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "../../core/di/Container";
import { Logger } from "../../core/logger/Logger";
import { EventBus } from "../../core/events/EventBus";
import { EventType } from "../../core/events/EventTypes";
import { MarkerWidget } from "./components/MarkerWidget";
import { MarkerAnimator } from "./MarkerAnimator";
import type { RGBA, AnyMarkerData } from "../../shared/types";
import { MarkerType } from "../../shared/types";
import { IMarker } from "@shared/interfaces";

const DEFAULT_BG_COLOR: RGBA = { r: 0.2, g: 0.5, b: 0.8, a: 0.9 };
const DEFAULT_TEXT_COLOR: RGBA = { r: 1, g: 1, b: 1, a: 1 };
const DEFAULT_ICON_NAME: string = '📍';

/**
 * Маркер на карте
 */
@injectable()
export class Marker implements IMarker {
  private logger: Logger;
  private eventBus: EventBus;
  private widget: MarkerWidget;
  private animator: MarkerAnimator;
  
  private _id: string;
  private _type: MarkerType;
  private _data: AnyMarkerData;
  private _isSelected: boolean = false;
  private _isHovered: boolean = false;
  private _isFromMarker: boolean = false;
  private _isToMarker: boolean = false;

  public onClick: (marker: Marker) => void = () => {};
  public onDoubleClick: (marker: Marker) => void = () => {};

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.EventBus) eventBus: EventBus,
    @inject(TYPES.MarkerWidget) widget: MarkerWidget,
    @inject(TYPES.MarkerAnimator) animator: MarkerAnimator,
    scene: Scene,
    data: AnyMarkerData
  ) {
    this.logger = logger.getLogger('Marker');
    this.eventBus = eventBus;
    this.widget = widget;
    this.animator = animator;
    
    this._id = data.id;
    this._type = data.type;
    this._data = data;
    
    const bgColorData = data.backgroundColor ?? DEFAULT_BG_COLOR;
    const textColorData = data.textColor ?? DEFAULT_TEXT_COLOR;
    const iconName = data.iconName ?? this.getDefaultIconForType(data.type);
    
    const bgColor = new Color3(bgColorData.r, bgColorData.g, bgColorData.b);
    const fgColor = new Color3(textColorData.r, textColorData.g, textColorData.b);
    
    this.widget.initialize(
      scene,
      data.position,
      bgColor,
      fgColor,
      this._type,
      iconName,
      data.name
    );
    
    this.setupInteractivity(scene);
    this.playSpawnAnimation();
    
    this.logger.debug(`Marker created: ${data.id} (${data.name})`);
  }

  private getDefaultIconForType(type: MarkerType): string {
    switch (type) {
      case MarkerType.MARKER:
        return '📍';
      case MarkerType.FLAG:
        return '🚩';
      case MarkerType.WAYPOINT:
        return '🔘';
      default:
        return DEFAULT_ICON_NAME;
    }
  }

  private setupInteractivity(scene: Scene): void {
    const mesh = this.widget.mesh;
    if (!mesh) {
      this.logger.warn(`No mesh for marker ${this._id}`);
      return;
    }

    mesh.isPickable = true;
    mesh.enablePointerMoveEvents = true;
    
    mesh.actionManager = new ActionManager(scene);
    
    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        console.log(`Marker clicked: ${this._id}`);
        this.handleClick();
      })
    );
    
    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnDoublePickTrigger, () => {
        console.log(`Marker double-clicked: ${this._id}`);
        this.handleDoubleClick();
      })
    );
    
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
    const root = this.widget.root;
    if (root) {
      await this.animator.playSpawnAnimation(root);
    }
  }

  public update(cameraPosition: Vector3): void {
    this.widget.updateBillboard(cameraPosition);
    this.widget.updateScale(cameraPosition);
  }

  public handleClick(): void {
    this.onClick(this);
    this.eventBus.emit(EventType.MARKER_SELECTED, { marker: this });
  }

  public handleDoubleClick(): void {
    this.onDoubleClick(this);
    this.eventBus.emit(EventType.MARKER_DOUBLE_CLICKED, { marker: this });
  }

  public setSelected(selected: boolean): void {
    if (this._isSelected === selected) return;
    
    this._isSelected = selected;
    this.widget.setSelected(selected);
    
    const root = this.widget.root;
    if (root) {
      this.animator.playSelectionAnimation(root, selected).catch(err => {
        this.logger.error('Selection animation error', err);
      });
    }
  }

  public setHovered(hovered: boolean): void {
    if (this._isHovered === hovered) return;
    
    this._isHovered = hovered;
    
    const root = this.widget.root;
    if (root) {
      this.animator.playHoverAnimation(root, hovered, this._isSelected);
    }
  }

  public setAsFromMarker(isFrom: boolean): void {
    this._isFromMarker = isFrom;
    this.widget.setAsFromMarker(isFrom);
  }

  public setAsToMarker(isTo: boolean): void {
    this._isToMarker = isTo;
    this.widget.setAsToMarker(isTo);
  }

  public setVisible(visible: boolean): void {
    this.widget.setVisible(visible);
  }

  public dispose(): void {
    this.widget.dispose();
    this.logger.debug(`Marker disposed: ${this._id}`);
  }

  public hasQR(): boolean {
    return this._type === MarkerType.FLAG && 'qr' in this._data;
  }

  public getQR(): string | undefined {
    return this._type === MarkerType.FLAG ? (this._data as any).qr : undefined;
  }

  // Геттеры
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
    return this._data.iconName ?? this.getDefaultIconForType(this._type);
  }

  public get floor(): number {
    return this._data.floor ?? 1;
  }

  public get backgroundColor(): RGBA {
    return this._data.backgroundColor ?? DEFAULT_BG_COLOR;
  }

  public get textColor(): RGBA {
    return this._data.textColor ?? DEFAULT_TEXT_COLOR;
  }

  public get position(): Vector3 {
    return this.widget.position;
  }

  public get isSelected(): boolean {
    return this._isSelected;
  }

  public get isHovered(): boolean {
    return this._isHovered;
  }

  public get isFromMarker(): boolean {
    return this._isFromMarker;
  }

  public get isToMarker(): boolean {
    return this._isToMarker;
  }

  public get root() {
    return this.widget.root;
  }

  public get mesh(): Mesh {
    return this.widget.mesh;
  }
}