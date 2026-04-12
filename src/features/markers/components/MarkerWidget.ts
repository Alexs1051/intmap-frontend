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

import { MarkerType } from "../../../shared/types";
import { MARKER_WIDGET } from "../../../shared/constants";

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
    text?: string
  ) {
    // -------------------------
    // ROOT
    // -------------------------
    this.root = new TransformNode("markerRoot", scene);
    this.root.position = position;

    // -------------------------
    // Рассчитываем размеры ДО создания plane
    // -------------------------
    const isMarker = type === MarkerType.MARKER;
    const iconSize = isMarker ? 32 : 48;

    // Предварительно измеряем ширину текста (используем дважды: для container и для textBlock)
    const textWidthPx = (isMarker && text)
      ? Math.ceil(this.measureTextWidth(text, 18, "bold", "Arial, sans-serif"))
      : 0;

    let containerWidth: number;
    let containerHeight: number;

    if (isMarker && text) {
      // Для маркера с текстом: прямоугольный контейнер
      containerWidth = iconSize + textWidthPx + 26; // icon + text + panel padding (8px) + textContainer padding (8px) + container padding (6px) + запас
      containerHeight = Math.max(iconSize + 18, 50);
    } else {
      // Для flag/waypoint: квадратный контейнер (только иконка)
      containerWidth = iconSize + 30;
      containerHeight = iconSize + 30;
    }

    // Пропорции для plane (чтобы текстура не искажалась)
    const planeAspect = containerWidth / containerHeight;
    const planeBaseSize = 1.5;
    const planeWidth = planeBaseSize * planeAspect;
    const planeHeight = planeBaseSize;

    console.log(`[MarkerWidget] Container size: ${containerWidth}x${containerHeight}, iconSize: ${iconSize}, type: ${isMarker ? 'MARKER' : 'FLAG/WP'}, hasText: ${!!text}, planeSize: ${planeWidth.toFixed(2)}x${planeHeight.toFixed(2)}`);

    // -------------------------
    // PLANE (размер соответствует пропорциям текстуры)
    // -------------------------
    this.plane = MeshBuilder.CreatePlane("markerPlane", {
      width: planeWidth,
      height: planeHeight
    }, scene);

    this.plane.parent = this.root;
    this.mesh = this.plane;

    // Отражаем по X, чтобы при billboard текст не был зеркальным
    this.plane.scaling.x = -1;

    const material = new StandardMaterial("markerMat", scene);
    material.disableLighting = true;
    material.emissiveColor = Color3.White();
    this.plane.material = material;

    // -------------------------
    // TEXTURE (ровно по размеру контейнера)
    // -------------------------
    this.texture = AdvancedDynamicTexture.CreateForMesh(this.plane, containerWidth, containerHeight, false);

    // -------------------------
    // CONTAINER (фон) - заполняет 100% текстуры
    // -------------------------
    this.container = new Rectangle();
    this.container.thickness = 0;
    this.container.cornerRadius = 12;
    this.container.background = this.toRGBA(bgColor);
    this.container.alpha = MARKER_WIDGET.BACKGROUND_ALPHA;
    this.container.width = "100%";
    this.container.height = "100%";
    this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    // Padding для outline (чтобы outline не обрезался)
    this.container.paddingLeft = "3px";
    this.container.paddingRight = "3px";
    this.container.paddingTop = "3px";
    this.container.paddingBottom = "3px";

    this.texture.addControl(this.container);

    // -------------------------
    // PANEL (layout: иконка + текст горизонтально)
    // -------------------------
    this.panel = new StackPanel();
    this.panel.name = "markerPanel";
    this.panel.isVertical = false;
    this.panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.panel.paddingLeft = "4px";
    this.panel.paddingRight = "4px";

    this.container.addControl(this.panel);

    // Контейнер для иконки с тенью
    const iconContainer = new Rectangle("iconContainer");
    iconContainer.name = "markerIconContainer";
    iconContainer.width = iconSize + "px";
    iconContainer.height = iconSize + "px";
    iconContainer.background = "";
    iconContainer.thickness = 0;

    // Тень (чёрная иконка, смещённая вниз-вправо)
    const iconPath = this.getIconPath(icon);
    const tintedIconUrl = await this.tintImage(iconPath, fgColor);
    const blackIconUrl = await this.tintImage(iconPath, new Color3(0, 0, 0));

    const iconShadow = new Image("iconShadow", blackIconUrl);
    iconShadow.width = iconSize + "px";
    iconShadow.height = iconSize + "px";
    iconShadow.stretch = Image.STRETCH_UNIFORM;
    iconShadow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    iconShadow.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    iconShadow.paddingLeft = "2px";
    iconShadow.paddingTop = "2px";
    iconShadow.alpha = 0.6;
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

    // -------------------------
    // TEXT - только для MARKER
    // -------------------------
    if (type === MarkerType.MARKER && text) {
      // Контейнер для текста с тенью (наложение)
      const textContainerWidth = textWidthPx + 8; // text width + internal padding
      const textContainer = new Rectangle("textContainer");
      textContainer.width = textContainerWidth + "px";
      textContainer.height = "100%";
      textContainer.background = "";
      textContainer.thickness = 0;

      // Тень текста (чёрная, смещённая вниз)
      this.textShadow = new TextBlock();
      this.textShadow.name = "markerTextShadow";
      this.textShadow.text = text;
      this.textShadow.fontSize = 18;
      this.textShadow.color = "black";
      this.textShadow.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      this.textShadow.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      this.textShadow.fontFamily = "Arial, sans-serif";
      this.textShadow.fontWeight = "bold";
      this.textShadow.width = "100%";
      this.textShadow.height = "100%";
      this.textShadow.paddingLeft = "2px";
      this.textShadow.paddingTop = "2px";
      this.textShadow.alpha = 0.6;

      textContainer.addControl(this.textShadow);

      // Основной текст
      this.textBlock = new TextBlock();
      this.textBlock.name = "markerText";
      this.textBlock.text = text;
      this.textBlock.fontSize = 18;
      this.textBlock.color = this.toRGBA(fgColor);
      this.textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      this.textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      this.textBlock.fontFamily = "Arial, sans-serif";
      this.textBlock.fontWeight = "bold";
      this.textBlock.width = "100%";
      this.textBlock.height = "100%";

      textContainer.addControl(this.textBlock);

      this.panel.addControl(textContainer);
      console.log(`[MarkerWidget] Text added: "${text}", textWidth: ${textWidthPx}px`);
    }

    console.log(`[MarkerWidget] Final container width: ${this.container.width}, height: ${this.container.height}`);

    this.plane.metadata = { widget: this };
  }

  // -------------------------
  // ICON PATH
  // -------------------------
  private getIconPath(iconName: string): string {
    const iconMap: { [key: string]: string } = {
      location_on: "/icons/waypoint.png",
      flag: "/icons/info.png",
      circle: "/icons/waypoint.png",
      "📍": "/icons/waypoint.png",
      "🚩": "/icons/info.png",
      "🔘": "/icons/waypoint.png"
    };

    return iconMap[iconName] || "/icons/waypoint.png";
  }

  // -------------------------
  // MEASURE TEXT WIDTH
  // -------------------------
  private measureTextWidth(text: string, fontSize: number, fontWeight: string, fontFamily: string): number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return text.length * 10; // fallback
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
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

    // Дополнительно: обновляем alpha контейнера для консистентности
    this.container.alpha = MARKER_WIDGET.BACKGROUND_ALPHA * globalAlpha;
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

  // -------------------------
  dispose() {
    this.texture?.dispose();
    this.plane?.dispose();
    this.root?.dispose();
  }
}