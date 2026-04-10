import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control,
  Grid
} from "@babylonjs/gui";
import { injectable, inject } from "inversify";
import { TYPES } from "../../../core/di/Container";
import { Logger } from "../../../core/logger/Logger";
import { MarkerType, RGBA } from "../../../shared/types";
import { MARKER_WIDGET } from "../../../shared/constants";

/**
 * Виджет маркера (GUI элемент)
 */
@injectable()
export class MarkerWidget {
  private logger: Logger;
  private config: typeof MARKER_WIDGET;

  private _root!: TransformNode;
  private _background!: Mesh;
  private _guiTexture!: AdvancedDynamicTexture;
  private _iconText!: TextBlock;
  private _titleText: TextBlock | null = null;
  private _backgroundRect!: Rectangle;
  private _outlineMesh: Mesh | null = null;

  private _backgroundColor!: Color3;
  private _foregroundColor!: Color3;
  private _type!: MarkerType;
  private _iconName!: string;
  private _title!: string;

  private _currentWidth!: number;
  private _currentHeight!: number;
  private _currentScale: number = 1.0;
  private _isSelected: boolean = false;
  private _isFromMarker: boolean = false;
  private _isToMarker: boolean = false;
  private _isAnimating: boolean = false;
  private _isVisible: boolean = true;

  constructor(
    @inject(TYPES.Logger) logger: Logger) {
    this.logger = logger.getLogger('MarkerWidget');
    this.config = MARKER_WIDGET;
  }

  /**
   * Преобразует RGBA в CSS строку
   */
  private rgbaToCss(color: RGBA): string {
    return `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${color.a})`;
  }

  /**
   * Инициализировать виджет
   */
  public initialize(
    scene: Scene,
    position: Vector3,
    backgroundColor: Color3,
    foregroundColor: Color3,
    type: MarkerType,
    iconName: string,
    title: string
  ): void {
    this._backgroundColor = backgroundColor;
    this._foregroundColor = foregroundColor;
    this._type = type;
    this._iconName = iconName;
    this._title = title;

    const sizeMultiplier = this.config.SIZE_MULTIPLIERS[type] || 1.0;

    if (this._type === MarkerType.FLAG || this._type === MarkerType.WAYPOINT) {
      this._currentWidth = (this.config.ICON_SIZE + (this.config.PADDING * 2)) * sizeMultiplier;
      this._currentHeight = this._currentWidth;
    } else {
      this._currentWidth = this.calculateWidth(title) * sizeMultiplier;
      this._currentHeight = (this.config.ICON_SIZE + (this.config.PADDING * 2)) * sizeMultiplier;
    }

    this._root = new TransformNode("markerRoot", scene);
    this._root.position = position.clone();

    this._background = this.createBackground(scene);
    this._guiTexture = AdvancedDynamicTexture.CreateForMesh(
      this._background,
      this._currentWidth,
      this._currentHeight,
      false
    );
    this._guiTexture.hasAlpha = true;

    if (this._type === MarkerType.FLAG || this._type === MarkerType.WAYPOINT) {
      this.createCircularLayout();
    } else {
      this.createRectangularLayout();
    }

    this.createOutlineWireframe(scene);

    this._background.metadata = { widget: this };

    this.logger.debug(`Widget initialized: ${title}`);
  }

  private createCircularLayout(): void {
    this._backgroundRect = new Rectangle("backgroundRect");
    this._backgroundRect.width = 1;
    this._backgroundRect.height = 1;
    this._backgroundRect.background = this.rgbaToCss({
      r: this._backgroundColor.r,
      g: this._backgroundColor.g,
      b: this._backgroundColor.b,
      a: this.config.BACKGROUND_ALPHA
    });
    this._backgroundRect.thickness = 0;
    this._backgroundRect.cornerRadius = 50;
    this._guiTexture.addControl(this._backgroundRect);

    const iconContainer = new Rectangle("iconContainer");
    iconContainer.width = 1;
    iconContainer.height = 1;
    iconContainer.background = "";
    iconContainer.thickness = 0;
    iconContainer.paddingLeft = this.config.PADDING;
    iconContainer.paddingRight = this.config.PADDING;
    iconContainer.paddingTop = this.config.PADDING;
    iconContainer.paddingBottom = this.config.PADDING;
    this._guiTexture.addControl(iconContainer);

    this._iconText = new TextBlock("iconText");
    this._iconText.text = this._iconName;
    this._iconText.color = this.rgbaToCss({
      r: this._foregroundColor.r,
      g: this._foregroundColor.g,
      b: this._foregroundColor.b,
      a: 1
    });
    this._iconText.fontSize = this.config.ICON_FONT_SIZE;
    this._iconText.fontFamily = "'Material Icons', 'Material Symbols Outlined'";
    this._iconText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._iconText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    iconContainer.addControl(this._iconText);
  }

  private createRectangularLayout(): void {
    this._backgroundRect = new Rectangle("backgroundRect");
    this._backgroundRect.width = 1;
    this._backgroundRect.height = 1;
    this._backgroundRect.background = this.rgbaToCss({
      r: this._backgroundColor.r,
      g: this._backgroundColor.g,
      b: this._backgroundColor.b,
      a: this.config.BACKGROUND_ALPHA
    });
    this._backgroundRect.thickness = 0;
    this._backgroundRect.cornerRadius = 6;
    this._guiTexture.addControl(this._backgroundRect);

    const grid = new Grid("markerGrid");
    grid.width = 1;
    grid.height = 1;
    const iconColumnWidth = (this.config.ICON_SIZE + this.config.PADDING * 2) / this._currentWidth;
    grid.addColumnDefinition(iconColumnWidth);
    grid.addColumnDefinition(1 - iconColumnWidth);
    grid.addRowDefinition(1.0);
    this._guiTexture.addControl(grid);

    const iconContainer = new Rectangle("iconContainer");
    iconContainer.width = 1;
    iconContainer.height = 1;
    iconContainer.background = "";
    iconContainer.thickness = 0;
    iconContainer.paddingLeft = this.config.PADDING;
    iconContainer.paddingRight = this.config.PADDING;
    grid.addControl(iconContainer, 0, 0);

    this._iconText = new TextBlock("iconText");
    this._iconText.text = this._iconName;
    this._iconText.color = this.rgbaToCss({
      r: this._foregroundColor.r,
      g: this._foregroundColor.g,
      b: this._foregroundColor.b,
      a: 1
    });
    this._iconText.fontSize = this.config.ICON_FONT_SIZE;
    this._iconText.fontFamily = "'Material Icons', 'Material Symbols Outlined'";
    this._iconText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._iconText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    iconContainer.addControl(this._iconText);

    const textContainer = new Rectangle("textContainer");
    textContainer.width = 1;
    textContainer.height = 1;
    textContainer.background = "";
    textContainer.thickness = 0;
    textContainer.paddingLeft = this.config.PADDING;
    textContainer.paddingRight = this.config.PADDING;
    grid.addControl(textContainer, 0, 1);

    this._titleText = new TextBlock("titleText");
    this._titleText.text = this._title;
    this._titleText.color = this.rgbaToCss({
      r: this._foregroundColor.r,
      g: this._foregroundColor.g,
      b: this._foregroundColor.b,
      a: 1
    });
    this._titleText.fontSize = this.config.FONT_SIZE;
    this._titleText.fontFamily = "Arial";
    this._titleText.fontWeight = "bold";
    this._titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this._titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this._titleText.resizeToFit = true;
    this._titleText.textWrapping = false;
    textContainer.addControl(this._titleText);
  }

  private calculateWidth(text: string): number {
    const baseWidth = this.config.ICON_SIZE + (this.config.PADDING * 4);
    const charWidth = 22;
    const textWidth = text.length * charWidth;
    const totalWidth = baseWidth + textWidth;
    const minWidth = 220;
    const maxWidth = 550;
    return Math.min(Math.max(totalWidth, minWidth), maxWidth);
  }

  private createBackground(scene: Scene): Mesh {
    const bg = MeshBuilder.CreatePlane("markerBg", {
      width: this._currentWidth / this.config.TEXTURE_SCALE,
      height: this._currentHeight / this.config.TEXTURE_SCALE
    }, scene);

    const material = new StandardMaterial("markerBgMat", scene);
    material.diffuseColor = new Color3(1, 1, 1);
    material.alpha = 0;
    material.backFaceCulling = false;

    bg.material = material;
    bg.parent = this._root;
    bg.position.z = 0;
    bg.isPickable = true;
    bg.enablePointerMoveEvents = true;
    bg.isVisible = true;

    this.logger.debug(`Background created for marker, isPickable: ${bg.isPickable}`);

    return bg;
  }

  private createOutlineWireframe(scene: Scene): void {
    const width = this._currentWidth / this.config.TEXTURE_SCALE;
    const height = this._currentHeight / this.config.TEXTURE_SCALE;

    this._outlineMesh = MeshBuilder.CreatePlane("outlineWireframe", {
      width: width * this.config.OUTLINE_SCALE,
      height: height * this.config.OUTLINE_SCALE
    }, scene);

    const outlineMaterial = new StandardMaterial("outlineMat", scene);
    outlineMaterial.diffuseColor = new Color3(1, 0.8, 0.2);
    outlineMaterial.wireframe = true;
    outlineMaterial.alpha = 0.8;
    outlineMaterial.backFaceCulling = false;

    this._outlineMesh.material = outlineMaterial;
    this._outlineMesh.parent = this._root;
    this._outlineMesh.position.z = -0.01;
    this._outlineMesh.setEnabled(false);
  }

  private brightenColor(color: Color3, factor: number): Color3 {
    return new Color3(
      Math.min(1, color.r * factor),
      Math.min(1, color.g * factor),
      Math.min(1, color.b * factor)
    );
  }

  public setSelected(selected: boolean): void {
    if (this._isSelected === selected) return;

    this._isSelected = selected;

    if (selected && this._type === MarkerType.MARKER) {
      const brightColor = this.brightenColor(this._backgroundColor, 1.3);
      this._backgroundRect.background = this.rgbaToCss({
        r: brightColor.r,
        g: brightColor.g,
        b: brightColor.b,
        a: this.config.BACKGROUND_ALPHA
      });
    } else if (!this._isFromMarker && !this._isToMarker && this._type === MarkerType.MARKER) {
      this._backgroundRect.background = this.rgbaToCss({
        r: this._backgroundColor.r,
        g: this._backgroundColor.g,
        b: this._backgroundColor.b,
        a: this.config.BACKGROUND_ALPHA
      });
    }
  }

  public setAsFromMarker(isFrom: boolean): void {
    this._isFromMarker = isFrom;
    if (isFrom) {
      this._outlineMesh?.setEnabled(true);
    } else if (!this._isToMarker) {
      this._outlineMesh?.setEnabled(false);
    }
  }

  public setAsToMarker(isTo: boolean): void {
    this._isToMarker = isTo;
    if (isTo) {
      this._outlineMesh?.setEnabled(true);
    } else if (!this._isFromMarker) {
      this._outlineMesh?.setEnabled(false);
    }
  }

  public updateScale(cameraPosition: Vector3): void {
    if (this._isAnimating) return;

    const distance = Vector3.Distance(this._root.position, cameraPosition);
    const OPTIMAL_DISTANCE = 20;
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 2.5;

    let targetScale = distance / OPTIMAL_DISTANCE;
    targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

    this._currentScale = this.lerp(this._currentScale, targetScale, 0.1);
    this._root.scaling.setAll(this._currentScale);
  }

  private lerp(start: number, end: number, amount: number): number {
    return start * (1 - amount) + end * amount;
  }

  public updateBillboard(cameraPosition: Vector3): void {
    this._root.lookAt(cameraPosition);
    this._root.rotate(Vector3.Up(), Math.PI);
  }

  public setTitle(title: string): void {
    if (this._titleText) {
      this._titleText.text = title;
    }
  }

  public setVisible(visible: boolean): void {
    this._isVisible = visible;
    this._root.setEnabled(visible);
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public dispose(): void {
    this._background.dispose();
    this._guiTexture.dispose();
    if (this._outlineMesh) {
      this._outlineMesh.dispose();
    }
    this._root.dispose();
  }

  public get position(): Vector3 {
    return this._root.position.clone();
  }

  public get root(): TransformNode {
    return this._root;
  }

  public get mesh(): Mesh {
    return this._background;
  }

  public get scale(): number {
    return this._currentScale;
  }

  public get type(): MarkerType {
    return this._type;
  }

  public setAnimating(animating: boolean): void {
    this._isAnimating = animating;
  }
}