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
import { logger } from "../../../core/logger/Logger";

const widgetLogger = logger.getLogger('MarkerWidget');

export class MarkerWidget {
  private readonly _root: TransformNode;
  private readonly _background: Mesh;
  private readonly _guiTexture: AdvancedDynamicTexture;
  private readonly _titleText: TextBlock;
  private readonly _iconContainer: Rectangle;
  private readonly _backgroundRect: Rectangle;
  
  private readonly _backgroundColor: Color3;
  private readonly _foregroundColor: Color3;
  private readonly _baseSize: number;
  private readonly _icon: string;
  private readonly _title: string;
  
  private _currentWidth: number;
  private _currentHeight: number;
  private _currentScale: number = 1.0;
  private _isSelected: boolean = false;
  
  private readonly ICON_SIZE = 60;
  private readonly PADDING = 8;
  private readonly FONT_SIZE = 36;
  private readonly TEXTURE_SCALE = 100;

  constructor(
    scene: Scene,
    position: Vector3,
    backgroundColor: Color3,
    foregroundColor: Color3,
    icon: string = "",
    title: string = "",
    size: number = 1.5
  ) {
    this._backgroundColor = backgroundColor;
    this._foregroundColor = foregroundColor;
    this._baseSize = size;
    this._icon = icon;
    this._title = title;
    this._currentWidth = this.calculateWidth(title);
    this._currentHeight = this.ICON_SIZE + (this.PADDING * 2);

    widgetLogger.debug(`Создание маркера "${title}"`, {
      width: this._currentWidth,
      height: this._currentHeight,
      position: position.toString()
    });

    this._root = new TransformNode("markerRoot", scene);
    this._root.position = position.clone();

    this._background = this.createBackground(scene);
    
    const gui = this.createGUI(scene);
    this._guiTexture = gui.guiTexture;
    this._titleText = gui.titleText;
    this._iconContainer = gui.iconContainer;
    this._backgroundRect = gui.backgroundRect;

    this._background.metadata = { widget: this };
  }

  private calculateWidth(text: string): number {
    const baseWidth = this.ICON_SIZE + (this.PADDING * 3);
    const textWidth = text.length * 24;
    return Math.max(200, baseWidth + textWidth);
  }

  private createBackground(scene: Scene): Mesh {
    const bg = MeshBuilder.CreatePlane("markerBg", {
      width: this._currentWidth / this.TEXTURE_SCALE,
      height: this._currentHeight / this.TEXTURE_SCALE
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
    
    return bg;
  }

  private createGUI(scene: Scene): {
    guiTexture: AdvancedDynamicTexture;
    titleText: TextBlock;
    iconContainer: Rectangle;
    backgroundRect: Rectangle;
  } {
    const guiTexture = AdvancedDynamicTexture.CreateForMesh(
      this._background,
      this._currentWidth,
      this._currentHeight,
      false
    );
    guiTexture.hasAlpha = true;

    const backgroundRect = new Rectangle("backgroundRect");
    backgroundRect.width = 1;
    backgroundRect.height = 1;
    backgroundRect.background = this._backgroundColor.toHexString();
    backgroundRect.alpha = 1.0;
    backgroundRect.cornerRadius = 6;
    backgroundRect.thickness = 0;
    guiTexture.addControl(backgroundRect);

    const grid = new Grid("markerGrid");
    grid.width = 1;
    grid.height = 1;
    
    const iconWidthPercent = this.ICON_SIZE / this._currentWidth;
    grid.addColumnDefinition(iconWidthPercent);
    grid.addColumnDefinition(1 - iconWidthPercent);
    grid.addRowDefinition(1.0);
    
    guiTexture.addControl(grid);

    const iconContainer = new Rectangle("iconContainer");
    iconContainer.width = 1;
    iconContainer.height = this.ICON_SIZE / this._currentHeight;
    iconContainer.background = "";
    iconContainer.thickness = 0;
    iconContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    iconContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    grid.addControl(iconContainer, 0, 0);

    const iconText = new TextBlock("iconText");
    iconText.text = this._icon || "📍";
    iconText.color = this._foregroundColor.toHexString();
    iconText.fontSize = this.FONT_SIZE;
    iconText.fontWeight = "bold";
    iconText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    iconText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    iconContainer.addControl(iconText);

    const textContainer = new Rectangle("textContainer");
    textContainer.width = 1;
    textContainer.height = 1;
    textContainer.background = "";
    textContainer.thickness = 0;
    textContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    textContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    grid.addControl(textContainer, 0, 1);

    const titleText = new TextBlock("titleText");
    titleText.text = this._title;
    titleText.color = this._foregroundColor.toHexString();
    titleText.fontSize = this.FONT_SIZE;
    titleText.fontFamily = "Arial";
    titleText.fontWeight = "bold";
    titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    titleText.resizeToFit = true;
    titleText.textWrapping = true;
    titleText.paddingLeft = 5;
    titleText.paddingRight = 5;
    
    textContainer.addControl(titleText);

    return { guiTexture, titleText, iconContainer, backgroundRect };
  }

  private brightenColor(color: Color3, factor: number): Color3 {
    return new Color3(
      Math.min(1, color.r * factor),
      Math.min(1, color.g * factor),
      Math.min(1, color.b * factor)
    );
  }

  public setSelected(selected: boolean, outlineColor?: Color3): void {
    if (this._isSelected === selected) return;
    
    this._isSelected = selected;
    
    if (selected) {
      const brightColor = this.brightenColor(this._backgroundColor, 1.5);
      this._backgroundRect.background = brightColor.toHexString();
    } else {
      this._backgroundRect.background = this._backgroundColor.toHexString();
    }
  }

  public updateScale(cameraPosition: Vector3): void {
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
    const newWidth = this.calculateWidth(title);
    
    if (Math.abs(newWidth - this._currentWidth) > 10) {
      widgetLogger.debug(`Обновление размера маркера "${title}": ${newWidth}px`);
      this._currentWidth = newWidth;
    }
    
    this._titleText.text = title;
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
}