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

export class MarkerWidget {
  private _scene: Scene;
  private _root: TransformNode;
  private _background: Mesh;
  private _outline: Mesh | null = null;
  
  // GUI элементы
  private _guiTexture: AdvancedDynamicTexture;
  private _titleText: TextBlock;
  private _iconContainer: Rectangle;
  private _backgroundRect: Rectangle;
  
  private _backgroundColor: Color3;
  private _foregroundColor: Color3;
  private _baseSize: number;
  private _title: string;
  private _icon: string;
  
  // Динамическая ширина
  private _currentWidth: number;
  private _currentHeight: number;
  
  // Масштабирование
  private _currentScale: number = 1.0;
  
  // Константы
  private readonly ICON_SIZE = 60; // px
  private readonly PADDING = 8; // px - минимальные отступы
  private readonly FONT_SIZE = 36; // px
  private readonly TEXTURE_SCALE = 100; // пикселей на единицу
  
  // Константы для масштабирования
  private readonly MIN_SCALE = 0.5; // Минимальный размер (50%)
  private readonly MAX_SCALE = 2.5; // Максимальный размер (150%)
  private readonly OPTIMAL_DISTANCE = 20; // Оптимальное расстояние для базового размера

  // Состояния
  private _isSelected: boolean = false;

  constructor(
    scene: Scene,
    position: Vector3,
    backgroundColor: Color3,
    foregroundColor: Color3,
    icon: string = "",
    title: string = "",
    size: number = 1.5
  ) {
    this._scene = scene;
    this._backgroundColor = backgroundColor;
    this._foregroundColor = foregroundColor;
    this._baseSize = size;
    this._icon = icon;
    this._title = title;

    // Вычисляем размеры
    this._currentWidth = this.calculateWidth(title);
    this._currentHeight = this.ICON_SIZE + (this.PADDING * 2);

    console.log(`📏 Маркер "${title}": ширина=${this._currentWidth.toFixed(2)}px, высота=${this._currentHeight.toFixed(2)}px`);

    // Создаём корневой узел
    this._root = new TransformNode("markerRoot", scene);
    this._root.position = position.clone();

    // Создаём все части маркера
    this.createBackground();
    this.createOutline();
    this.createGUI();
  }

  /**
   * Вычисляет ширину в пикселях на основе длины текста
   */
  private calculateWidth(text: string): number {
    // Базовая ширина: иконка + отступы слева и справа
    const baseWidth = this.ICON_SIZE + (this.PADDING * 3); // Увеличил базовую ширину
    
    // Динамическая ширина текста (увеличил коэффициент)
    const textWidth = text.length * 24; // Увеличил с 18 до 24px на символ
    
    // Минимальная ширина для коротких слов
    const minWidth = 200; // Минимальная ширина в пикселях
    
    const totalWidth = Math.max(minWidth, baseWidth + textWidth);
    
    console.log(`📏 Текст "${text}": длина=${text.length}, ширина=${totalWidth}px`);
    
    return totalWidth;
  }

  private createBackground(): void {
    // Создаём плоский прямоугольник с динамическими размерами
    this._background = MeshBuilder.CreatePlane("markerBg", {
      width: this._currentWidth / this.TEXTURE_SCALE,
      height: this._currentHeight / this.TEXTURE_SCALE
    }, this._scene);
    
    const material = new StandardMaterial("markerBgMat", this._scene);
    material.diffuseColor = new Color3(1, 1, 1);
    material.alpha = 0;
    material.backFaceCulling = false;
    
    this._background.material = material;
    this._background.parent = this._root;
    this._background.position.z = 0;
    
    // ВАЖНО: Делаем фон кликабельным
    this._background.isPickable = true;
    this._background.enablePointerMoveEvents = true; // Включаем события мыши
    
    // Сохраняем ссылку на виджет в меше для идентификации
    this._background.metadata = { widget: this };
  }

  private createOutline(): void {
    this._outline = MeshBuilder.CreatePlane("markerOutline", {
      width: this._currentWidth / this.TEXTURE_SCALE + 0.1,
      height: this._currentHeight / this.TEXTURE_SCALE + 0.1
    }, this._scene);
    
    const outlineMaterial = new StandardMaterial("markerOutlineMat", this._scene);
    outlineMaterial.diffuseColor = new Color3(0.3, 0.6, 1.0);
    outlineMaterial.alpha = 0;
    outlineMaterial.backFaceCulling = false;
    
    this._outline.material = outlineMaterial;
    this._outline.parent = this._root;
    this._outline.position.z = -0.02;
    this._outline.setEnabled(false);
  }

  private createGUI(): void {
    // Создаём текстуру с динамическим размером
    this._guiTexture = AdvancedDynamicTexture.CreateForMesh(
      this._background,
      this._currentWidth,
      this._currentHeight,
      false
    );
    
    this._guiTexture.hasAlpha = true;

    // === ОСНОВНОЙ ФОН ===
    this._backgroundRect = new Rectangle("backgroundRect");
    this._backgroundRect.width = 1;
    this._backgroundRect.height = 1;
    this._backgroundRect.background = this._backgroundColor.toHexString();
    this._backgroundRect.alpha = 1.0;
    this._backgroundRect.cornerRadius = 6;
    this._backgroundRect.thickness = 0;
    this._guiTexture.addControl(this._backgroundRect);

    // Используем Grid для точного позиционирования
    const grid = new Grid("markerGrid");
    grid.width = 1;
    grid.height = 1;
    
    // Две колонки: иконка (фиксированная ширина) и текст (всё остальное)
    const iconWidthPercent = this.ICON_SIZE / this._currentWidth;
    const textWidthPercent = 1 - iconWidthPercent;
    
    grid.addColumnDefinition(iconWidthPercent); // Иконка
    grid.addColumnDefinition(textWidthPercent); // Текст
    
    // Одна строка
    grid.addRowDefinition(1.0);
    
    this._guiTexture.addControl(grid);

    // === ИКОНКА ===
    this._iconContainer = new Rectangle("iconContainer");
    this._iconContainer.width = 1;
    this._iconContainer.height = this.ICON_SIZE / this._currentHeight;
    this._iconContainer.background = ""; // Без фона
    this._iconContainer.thickness = 0;
    this._iconContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._iconContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    grid.addControl(this._iconContainer, 0, 0);

    const iconText = new TextBlock("iconText");
    iconText.text = this._icon || "📍";
    iconText.color = this._foregroundColor.toHexString();
    iconText.fontSize = this.FONT_SIZE;
    iconText.fontWeight = "bold";
    iconText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    iconText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this._iconContainer.addControl(iconText);

    // === ТЕКСТ ===
    const textContainer = new Rectangle("textContainer");
    textContainer.width = 1;
    textContainer.height = 1;
    textContainer.background = "";
    textContainer.thickness = 0;
    textContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    textContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    grid.addControl(textContainer, 0, 1);

    this._titleText = new TextBlock("titleText");
    this._titleText.text = this._title;
    this._titleText.color = this._foregroundColor.toHexString();
    this._titleText.fontSize = this.FONT_SIZE;
    this._titleText.fontFamily = "Arial";
    this._titleText.fontWeight = "bold";
    this._titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this._titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this._titleText.resizeToFit = true;
    this._titleText.textWrapping = true; // Разрешаем перенос текста
    this._titleText.paddingLeft = 5;
    this._titleText.paddingRight = 5;
    
    textContainer.addControl(this._titleText);
  }

  /**
   * Обновить масштаб маркера на основе расстояния до камеры
   */
  public updateScale(cameraPosition: Vector3): void {
    // Вычисляем расстояние от маркера до камеры
    const distance = Vector3.Distance(this._root.position, cameraPosition);
    
    // Расчёт масштаба: прямая пропорция к расстоянию
    // Чем дальше камера, тем больше маркер
    // На расстоянии OPTIMAL_DISTANCE масштаб = 1.0
    // На расстоянии OPTIMAL_DISTANCE * 2 масштаб = 2.0
    // На расстоянии OPTIMAL_DISTANCE / 2 масштаб = 0.5
    let targetScale = distance / this.OPTIMAL_DISTANCE;
    
    // Ограничиваем минимальным и максимальным масштабом
    targetScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, targetScale));
    
    // Плавно применяем масштаб с интерполяцией для плавности
    this._currentScale = this.lerp(this._currentScale, targetScale, 0.1);
    
    // Применяем масштаб к корневому узлу
    this._root.scaling.setAll(this._currentScale);
  }

  /**
   * Линейная интерполяция для плавности
   */
  private lerp(start: number, end: number, amount: number): number {
    return start * (1 - amount) + end * amount;
  }

  /**
   * Обновить билборд
   */
  public updateBillboard(cameraPosition: Vector3): void {
    this._root.lookAt(cameraPosition);
    this._root.rotate(Vector3.Up(), Math.PI);
  }

  public setSelected(selected: boolean, outlineColor: Color3): void {
    this._isSelected = selected;
    
    if (this._outline) {
      this._outline.setEnabled(selected);
      
      if (selected) {
        const material = this._outline.material as StandardMaterial;
        material.diffuseColor = outlineColor.clone();
        material.alpha = 0.5;
        
        this._backgroundRect.background = outlineColor.toHexString();
      } else {
        this._backgroundRect.background = this._backgroundColor.toHexString();
      }
    }
  }

  public setTitle(title: string): void {
    this._title = title;
    
    const newWidth = this.calculateWidth(title);
    
    if (Math.abs(newWidth - this._currentWidth) > 10) {
      this._currentWidth = newWidth;
      
      // Полностью пересоздаём виджет
      this._background.dispose();
      this._outline?.dispose();
      this._guiTexture.dispose();
      
      this.createBackground();
      this.createOutline();
      this.createGUI();
    } else if (this._titleText) {
      this._titleText.text = title;
    }
  }

  public setColors(backgroundColor: Color3, foregroundColor: Color3): void {
    this._backgroundColor = backgroundColor;
    this._foregroundColor = foregroundColor;
    
    if (!this._isSelected) {
      this._backgroundRect.background = backgroundColor.toHexString();
    }
    this._iconContainer.background = foregroundColor.toHexString();
    
    if (this._titleText) {
      this._titleText.color = foregroundColor.toHexString();
    }
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