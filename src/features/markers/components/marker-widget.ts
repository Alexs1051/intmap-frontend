import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  Color3
} from "@babylonjs/core";

import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Image,
  StackPanel,
  Control
} from "@babylonjs/gui";

import { MarkerType } from "@shared/types";
import { MARKER_WIDGET } from "@shared/constants";

// Кэш для измерения текста
let textMeasureCanvas: HTMLCanvasElement | null = null;

/**
 * Виджет маркера (GUI на плоскости)
 * Отображает иконку, текст и обрабатывает состояния (выделение, from/to)
 */
export class MarkerWidget {
  public root!: TransformNode;
  public mesh!: any;

  private plane!: any;
  private texture!: AdvancedDynamicTexture;

  private container!: Rectangle;
  private panel!: StackPanel;

  private iconImage!: Image;
  private textBlock!: TextBlock;
  private textShadow!: TextBlock;

  private _isVisible = true;
  private _isSelected = false;
  private _isFromMarker = false;
  private _isToMarker = false;
  private _baseBgAlpha: number = MARKER_WIDGET.BACKGROUND_ALPHA; // Базовая прозрачность фона из MARKER_COLORS
  private _baseBgColor: Color3 = Color3.White(); // Базовый цвет фона

  private static iconCache: Map<string, string> = new Map();

  public get isVisible() {
    return this._isVisible;
  }

  public get position(): Vector3 {
    return this.root.position;
  }

  async initialize(
    scene: Scene,
    position: Vector3,
    bgColor: Color3,
    fgColor: Color3,
    type: MarkerType,
    icon: string,
    text?: string,
    bgAlpha: number = MARKER_WIDGET.BACKGROUND_ALPHA
  ) {
    this.root = new TransformNode("markerRoot", scene);
    this.root.position = position;

    // Рассчитываем размеры ДО создания plane
    const isMarker = type === MarkerType.MARKER;
    const iconSize = isMarker ? MARKER_WIDGET.ICON_SIZE_MARKER : MARKER_WIDGET.ICON_SIZE_FLAG;
    const textWidthPx = (isMarker && text) ? this.measureTextWidth(text, MARKER_WIDGET.FONT_SIZE) : 0;

    let containerWidth: number;
    let containerHeight: number;

    if (isMarker && text) {
      containerWidth = iconSize + textWidthPx + MARKER_WIDGET.PADDING_HORIZONTAL;
      containerHeight = Math.max(iconSize + MARKER_WIDGET.PADDING_VERTICAL, MARKER_WIDGET.MIN_HEIGHT);
    } else {
      containerWidth = iconSize + MARKER_WIDGET.PADDING_HORIZONTAL;
      containerHeight = iconSize + MARKER_WIDGET.PADDING_HORIZONTAL;
    }

    // Пропорции plane
    const planeAspect = containerWidth / containerHeight;
    const planeBaseSize = MARKER_WIDGET.PLANE_BASE_SIZE;
    const planeWidth = planeBaseSize * planeAspect;
    const planeHeight = planeBaseSize;

    this.plane = MeshBuilder.CreatePlane("markerPlane", {
      width: planeWidth,
      height: planeHeight
    }, scene);

    this.plane.parent = this.root;
    this.mesh = this.plane;
    this.plane.scaling.x = -1; // Зеркалим, чтобы текст не был отражённым

    const material = new StandardMaterial("markerMat", scene);
    material.disableLighting = true;
    material.emissiveColor = Color3.White();
    this.plane.material = material;

    // Текстура
    this.texture = AdvancedDynamicTexture.CreateForMesh(this.plane, containerWidth, containerHeight, false);

    // Фон (container) - alpha применяется ТОЛЬКО к фону через background color
    this.container = new Rectangle();
    this.container.thickness = 0;
    this.container.cornerRadius = 12;
    this.container.background = this.toRGBAWithAlpha(bgColor, bgAlpha);
    this.container.color = "transparent"; // Обводка по умолчанию прозрачная
    this._baseBgAlpha = bgAlpha;
    this._baseBgColor = bgColor;
    this.container.alpha = 1.0; // Не влияем на прозрачность содержимого!
    this.container.width = "100%";
    this.container.height = "100%";
    this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.container.paddingLeft = MARKER_WIDGET.OUTLINE_PADDING;
    this.container.paddingRight = MARKER_WIDGET.OUTLINE_PADDING;
    this.container.paddingTop = MARKER_WIDGET.OUTLINE_PADDING;
    this.container.paddingBottom = MARKER_WIDGET.OUTLINE_PADDING;
    this.texture.addControl(this.container);

    // Панель (иконка + текст горизонтально)
    this.panel = new StackPanel();
    this.panel.name = "markerPanel";
    this.panel.isVertical = false;
    this.panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.panel.paddingLeft = MARKER_WIDGET.PANEL_PADDING;
    this.panel.paddingRight = MARKER_WIDGET.PANEL_PADDING;
    this.container.addControl(this.panel);

    await this.createIcon(icon, fgColor, iconSize);

    // Текст - только для MARKER
    if (type === MarkerType.MARKER && text) {
      this.createText(text, fgColor, textWidthPx);
    }

    this.plane.metadata = { widget: this };
  }

  // -------------------------
  // ICON PATH
  // -------------------------
  private getIconPath(iconName: string): string {
    const iconMap: { [key: string]: string } = {
      location_on: MARKER_WIDGET.ICON_PATH_WAYPOINT,
      flag: MARKER_WIDGET.ICON_PATH_FLAG,
      circle: MARKER_WIDGET.ICON_PATH_MARKER,
      "📍": MARKER_WIDGET.ICON_PATH_MARKER,
      "🚩": MARKER_WIDGET.ICON_PATH_FLAG,
      "🔘": MARKER_WIDGET.ICON_PATH_WAYPOINT
    };

    return iconMap[iconName] || MARKER_WIDGET.ICON_PATH_MARKER;
  }

  /**
   * Создать иконку с тенью
   */
  private async createIcon(icon: string, fgColor: Color3, iconSize: number): Promise<void> {
    const iconContainer = new Rectangle("iconContainer");
    iconContainer.name = "markerIconContainer";
    iconContainer.width = iconSize + "px";
    iconContainer.height = iconSize + "px";
    iconContainer.background = "";
    iconContainer.thickness = 0;

    const iconPath = this.getIconPath(icon);
    const [tintedIconUrl, blackIconUrl] = await Promise.all([
      this.tintImage(iconPath, fgColor),
      this.tintImage(iconPath, new Color3(0, 0, 0))
    ]);

    // Тень
    const iconShadow = new Image("iconShadow", blackIconUrl);
    iconShadow.width = iconSize + "px";
    iconShadow.height = iconSize + "px";
    iconShadow.stretch = Image.STRETCH_UNIFORM;
    iconShadow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    iconShadow.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    iconShadow.paddingLeft = MARKER_WIDGET.SHADOW_OFFSET;
    iconShadow.paddingTop = MARKER_WIDGET.SHADOW_OFFSET;
    iconShadow.alpha = MARKER_WIDGET.SHADOW_ALPHA;
    iconContainer.addControl(iconShadow);

    // Основная иконка
    this.iconImage = new Image("icon", tintedIconUrl);
    this.iconImage.width = iconSize + "px";
    this.iconImage.height = iconSize + "px";
    this.iconImage.stretch = Image.STRETCH_UNIFORM;
    this.iconImage.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.iconImage.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    iconContainer.addControl(this.iconImage);

    this.panel.addControl(iconContainer);
  }

  /**
   * Создать текст с тенью
   */
  private createText(text: string, fgColor: Color3, textWidthPx: number): void {
    const textContainerWidth = textWidthPx + MARKER_WIDGET.TEXT_PADDING;
    const textContainer = new Rectangle("textContainer");
    textContainer.width = textContainerWidth + "px";
    textContainer.height = "100%";
    textContainer.background = "";
    textContainer.thickness = 0;

    // Тень
    this.textShadow = new TextBlock();
    this.textShadow.name = "markerTextShadow";
    this.textShadow.text = text;
    this.textShadow.fontSize = MARKER_WIDGET.FONT_SIZE;
    this.textShadow.color = "black";
    this.textShadow.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.textShadow.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.textShadow.fontFamily = MARKER_WIDGET.FONT_FAMILY;
    this.textShadow.fontWeight = "bold";
    this.textShadow.width = "100%";
    this.textShadow.height = "100%";
    this.textShadow.paddingLeft = MARKER_WIDGET.SHADOW_OFFSET;
    this.textShadow.paddingTop = MARKER_WIDGET.SHADOW_OFFSET;
    this.textShadow.alpha = MARKER_WIDGET.SHADOW_ALPHA;
    textContainer.addControl(this.textShadow);

    // Основной текст
    this.textBlock = new TextBlock();
    this.textBlock.name = "markerText";
    this.textBlock.text = text;
    this.textBlock.fontSize = MARKER_WIDGET.FONT_SIZE;
    this.textBlock.color = this.toRGBA(fgColor);
    this.textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.textBlock.fontFamily = MARKER_WIDGET.FONT_FAMILY;
    this.textBlock.fontWeight = "bold";
    this.textBlock.width = "100%";
    this.textBlock.height = "100%";
    textContainer.addControl(this.textBlock);

    this.panel.addControl(textContainer);
  }

  // -------------------------
  // MEASURE TEXT WIDTH
  // -------------------------
  private measureTextWidth(text: string, fontSize: number): number {
    // Переиспользуем canvas для производительности
    if (!textMeasureCanvas) {
      textMeasureCanvas = document.createElement('canvas');
    }
    const ctx = textMeasureCanvas.getContext('2d');
    if (!ctx) return text.length * 10;

    ctx.font = `bold ${fontSize}px ${MARKER_WIDGET.FONT_FAMILY}`;
    return ctx.measureText(text).width;
  }

  private async tintImage(imageUrl: string, color: Color3): Promise<string> {
    const cacheKey = `${imageUrl}-${color.r}-${color.g}-${color.b}`;
    if (MarkerWidget.iconCache.has(cacheKey)) {
      return MarkerWidget.iconCache.get(cacheKey)!;
    }

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Рисуем оригинальное изображение
          ctx.drawImage(img, 0, 0);
          // Применяем цветовую тонировку
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL();
          MarkerWidget.iconCache.set(cacheKey, dataUrl);
          resolve(dataUrl);
        } else {
          reject(new Error('Cannot get canvas context'));
        }
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  // -------------------------
  // BILLBOARD
  // -------------------------
  updateBillboard(cameraPosition: Vector3) {
    if (!this.root) return;
    this.root.lookAt(cameraPosition);
  }

  // -------------------------
  // SCALE + LOD
  // -------------------------
  updateScale(cameraPosition: Vector3) {
    if (!this.root || !this.plane || !this.plane.material) return;

    const dist = Vector3.Distance(this.root.position, cameraPosition);

    const scale = MARKER_WIDGET.OPTIMAL_DISTANCE / dist;

    const clamped = Math.min(
      MARKER_WIDGET.MAX_SCALE,
      Math.max(MARKER_WIDGET.MIN_SCALE, scale)
    );

    // Масштабируем по расстоянию
    this.root.scaling.setAll(clamped);

    // ---- Единый fade всей метки (фон + иконка + текст)
    const fadeStart = MARKER_WIDGET.FADE_START_DISTANCE;
    const fadeEnd = MARKER_WIDGET.HIDE_TEXT_DISTANCE;

    let globalAlpha: number;

    if (dist <= fadeStart) {
      globalAlpha = 1;
    } else if (dist >= fadeEnd) {
      globalAlpha = 0;
    } else {
      globalAlpha = 1 - (dist - fadeStart) / (fadeEnd - fadeStart);
    }

    // Применяем fade к материалу plane (это затронет всю текстуру целиком)
    const mat = this.plane.material as StandardMaterial;
    mat.alpha = globalAlpha;

    // Обновляем alpha контейнера для консистентности
    // container.alpha = 1.0 (не влияет на содержимое), а fade применяется через background
    const fadedBgAlpha = this._baseBgAlpha * globalAlpha;
    this.container.background = this.toRGBAWithAlpha(this._baseBgColor, fadedBgAlpha);
  }

  // -------------------------
  // VISIBILITY
  // -------------------------
  setVisible(visible: boolean) {
    this._isVisible = visible;

    if (this.mesh) {
      this.mesh.isPickable = visible;
    }

    if (this.root) {
      this.root.setEnabled(visible);
    }
  }

  // -------------------------
  // TEXT
  // -------------------------
  setTitle(title: string) {
    if (this.textBlock) {
      this.textBlock.text = title;
    }
  }

  // -------------------------
  // STATES
  // -------------------------
  setSelected(selected: boolean) {
    this._isSelected = selected;
    this.updateOutline();
  }

  setAsFromMarker(isFrom: boolean) {
    this._isFromMarker = isFrom;
    this.updateOutline();
  }

  setAsToMarker(isTo: boolean) {
    this._isToMarker = isTo;
    this.updateOutline();
  }

  private updateOutline() {
    if (!this.container) return;

    // Приоритет: From/To > обычное выделение
    if (this._isFromMarker) {
      this.container.thickness = 3;
      this.container.color = "rgba(0, 200, 0, 1)"; // зелёный
    } else if (this._isToMarker) {
      this.container.thickness = 3;
      this.container.color = "rgba(255, 50, 50, 1)"; // красный
    } else if (this._isSelected) {
      this.container.thickness = 3;
      this.container.color = "rgba(255, 255, 255, 1)"; // белый
    } else {
      // Без обводки по умолчанию (как обычная метка)
      this.container.thickness = 0;
      this.container.color = "transparent";
    }
  }

  // -------------------------
  // UTILS
  // -------------------------
  private toRGBA(color: Color3): string {
    return `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`;
  }

  /**
   * Преобразовать цвет в rgba с указанной прозрачностью
   */
  private toRGBAWithAlpha(color: Color3, alpha: number): string {
    return `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${alpha})`;
  }

  // -------------------------
  dispose() {
    this.texture?.dispose();
    this.plane?.dispose();
    this.root?.dispose();
  }
}