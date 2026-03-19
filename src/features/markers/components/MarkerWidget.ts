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
import { MarkerType, RGBA } from "../types";
import { logger } from "../../../core/logger/Logger";
import { rgbaToCss } from "../utils/iconUtils";

const widgetLogger = logger.getLogger('MarkerWidget');

export class MarkerWidget {
  private readonly _root: TransformNode;
  private readonly _background: Mesh;
  private readonly _guiTexture: AdvancedDynamicTexture;
  private readonly _titleText: TextBlock | null = null; // Может быть null
  private readonly _iconText: TextBlock;
  private readonly _backgroundRect: Rectangle;
  
  private readonly _backgroundColor: RGBA;
  private readonly _textColor: RGBA;
  private readonly _type: MarkerType;
  private readonly _iconName: string;
  private readonly _title: string;
  private readonly _showTitle: boolean; // Флаг для отображения текста
  
  private _currentWidth: number;
  private _currentHeight: number;
  private _currentScale: number = 1.0;
  private _isSelected: boolean = false;
  
  // Константы размеров
  private readonly ICON_SIZE = 48;
  private readonly PADDING = 16;
  private readonly FONT_SIZE = 28;
  private readonly ICON_FONT_SIZE = 40;
  private readonly TEXTURE_SCALE = 100;
  
  // Маппинг типов маркеров на иконки из Material Icons
  private readonly ICON_MAP = {
    [MarkerType.MARKER]: 'location_on',
    [MarkerType.FLAG]: 'flag',
    [MarkerType.WAYPOINT]: 'trip_origin'
  };
  
  // Разные размеры для разных типов
  private readonly SIZE_MULTIPLIERS = {
    [MarkerType.MARKER]: 1.0,
    [MarkerType.FLAG]: 1.2,
    [MarkerType.WAYPOINT]: 0.8
  };

  constructor(
    scene: Scene,
    position: Vector3,
    backgroundColor: RGBA,
    textColor: RGBA,
    type: MarkerType,
    iconName: string,
    title: string,
    size: number = 1.5
  ) {
    this._backgroundColor = backgroundColor;
    this._textColor = textColor;
    this._type = type;
    this._iconName = iconName || this.ICON_MAP[type] || 'circle';
    this._title = title;
    
    // Определяем, нужно ли показывать текст
    this._showTitle = (type === MarkerType.MARKER);
    
    const sizeMultiplier = this.SIZE_MULTIPLIERS[type] || 1.0;
    
    // Расчет ширины зависит от того, показываем ли мы текст
    this._currentWidth = this.calculateOptimalWidth(title, this._showTitle) * sizeMultiplier;
    
    // Высота всегда одинаковая (иконка + отступы)
    this._currentHeight = (this.ICON_SIZE + (this.PADDING * 2)) * sizeMultiplier;

    widgetLogger.debug(`Создание маркера "${title}" типа ${type}`, {
      width: this._currentWidth,
      height: this._currentHeight,
      position: position.toString(),
      icon: this._iconName,
      showTitle: this._showTitle
    });

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

    // Фоновый прямоугольник с RGBA
    this._backgroundRect = new Rectangle("backgroundRect");
    this._backgroundRect.width = 1;
    this._backgroundRect.height = 1;
    this._backgroundRect.background = rgbaToCss(this._backgroundColor);
    this._backgroundRect.thickness = 0;
    this._backgroundRect.cornerRadius = 8;
    this._guiTexture.addControl(this._backgroundRect);

    // Создаём сетку для контента
    const contentGrid = new Grid("contentGrid");
    contentGrid.width = 1;
    contentGrid.height = 1;
    
    if (this._showTitle) {
      // Если показываем текст - две колонки
      contentGrid.addColumnDefinition(this.ICON_SIZE / this._currentWidth);
      contentGrid.addColumnDefinition(1 - this.ICON_SIZE / this._currentWidth);
    } else {
      // Если только иконка - одна колонка по центру
      contentGrid.addColumnDefinition(1);
    }
    contentGrid.addRowDefinition(1.0);
    this._guiTexture.addControl(contentGrid);

    // Иконка (векторная) - всегда показываем
    this.addVectorIcon(contentGrid);

    // Текст заголовка (только для MARKER)
    if (this._showTitle) {
      const textContainer = new Rectangle("textContainer");
      textContainer.width = 1;
      textContainer.height = 1;
      textContainer.background = "";
      textContainer.thickness = 0;
      textContainer.paddingLeft = this.PADDING;
      textContainer.paddingRight = this.PADDING;
      contentGrid.addControl(textContainer, 0, 1);

      this._titleText = new TextBlock("titleText");
      this._titleText.text = this._title;
      this._titleText.color = rgbaToCss(this._textColor);
      this._titleText.fontSize = this.FONT_SIZE;
      this._titleText.fontFamily = "Arial";
      this._titleText.fontWeight = "bold";
      this._titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      this._titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      this._titleText.resizeToFit = true;
      this._titleText.textWrapping = false;
      textContainer.addControl(this._titleText);
    }

    this._background.metadata = { widget: this };
  }

  /**
   * Оптимальный расчет ширины на основе длины текста и необходимости его отображения
   */
  private calculateOptimalWidth(text: string, showTitle: boolean): number {
    if (!showTitle) {
      // Если текст не показываем - ширина только под иконку
      const iconOnlyWidth = this.ICON_SIZE + (this.PADDING * 2);
      return Math.max(iconOnlyWidth, 100);
    }
    
    // Базовая ширина: иконка + отступы слева и справа
    const baseWidth = this.ICON_SIZE + (this.PADDING * 3);
    
    // Точный расчет ширины текста: каждый символ ~18px
    const charWidth = 18;
    const textWidth = text.length * charWidth;
    
    // Добавляем небольшой запас
    const totalWidth = baseWidth + textWidth + 10;
    
    // Минимальная и максимальная ширина
    const minWidth = 200;
    const maxWidth = 500;
    
    return Math.min(Math.max(totalWidth, minWidth), maxWidth);
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

  /**
   * Добавить векторную иконку из Material Icons
   */
  private addVectorIcon(grid: Grid): void {
    const iconContainer = new Rectangle("iconContainer");
    iconContainer.width = 1;
    iconContainer.height = 1;
    iconContainer.background = "";
    iconContainer.thickness = 0;
    
    if (this._showTitle) {
      grid.addControl(iconContainer, 0, 0);
    } else {
      grid.addControl(iconContainer, 0, 0);
      // Центрируем иконку
      iconContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    }

    this._iconText = new TextBlock("iconText");
    this._iconText.text = this._iconName;
    this._iconText.color = rgbaToCss(this._textColor);
    this._iconText.fontSize = this.ICON_FONT_SIZE;
    this._iconText.fontFamily = "Material Icons, Material Symbols Outlined";
    this._iconText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._iconText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    
    iconContainer.addControl(this._iconText);
  }

  /**
   * Увеличить яркость цвета (для выделения)
   */
  private brightenColor(color: RGBA, factor: number): RGBA {
    return {
      r: Math.min(1, color.r * factor),
      g: Math.min(1, color.g * factor),
      b: Math.min(1, color.b * factor),
      a: color.a
    };
  }

  /**
   * Установить состояние выделения
   */
  public setSelected(selected: boolean): void {
    if (this._isSelected === selected) return;
    
    this._isSelected = selected;
    
    if (selected) {
      const brightColor = this.brightenColor(this._backgroundColor, 1.3);
      this._backgroundRect.background = rgbaToCss(brightColor);
    } else {
      this._backgroundRect.background = rgbaToCss(this._backgroundColor);
    }
  }

  /**
   * Обновить масштаб маркера
   */
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

  /**
   * Обновить билборд (поворот к камере)
   */
  public updateBillboard(cameraPosition: Vector3): void {
    this._root.lookAt(cameraPosition);
    this._root.rotate(Vector3.Up(), Math.PI);
  }

  /**
   * Установить заголовок
   */
  public setTitle(title: string): void {
    if (this._titleText) {
      this._titleText.text = title;
    }
  }

  // Геттеры
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

  public setVisible(visible: boolean): void {
    this._root.setEnabled(visible);
  }
}