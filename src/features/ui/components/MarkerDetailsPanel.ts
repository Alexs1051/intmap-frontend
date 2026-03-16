import { Marker } from "../../markers/Marker";
import { MarkerType } from "../../markers/types";
import { Color3 } from "@babylonjs/core";

export class MarkerDetailsPanel {
  private _container: HTMLDivElement;
  private _contentContainer: HTMLDivElement;
  private _isVisible: boolean = false;
  private _currentMarker: Marker | null = null;
  private _onCloseCallback: (() => void) | null = null;
  private _onFocusCallback: ((marker: Marker) => void) | null = null;

  constructor() {
    this.createPanel();
  }

  private createPanel(): void {
    // Основной контейнер панели
    this._container = document.createElement('div');
    this._container.id = 'marker-details-panel';
    this._container.style.cssText = `
      position: fixed;
      top: 0;
      left: -400px;
      width: 360px;
      height: 100vh;
      background: rgba(30, 30, 40, 0.95);
      backdrop-filter: blur(10px);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
      z-index: 1500;
      transition: left 0.3s ease;
      display: flex;
      flex-direction: column;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Заголовок панели
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Детали метки';
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    `;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: #aaa;
      font-size: 20px;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 5px;
      transition: all 0.2s;
    `;
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.color = '#fff';
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.color = '#aaa';
      closeButton.style.background = 'none';
    });
    closeButton.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeButton);
    this._container.appendChild(header);

    // Контейнер для контента
    this._contentContainer = document.createElement('div');
    this._contentContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    `;
    this._container.appendChild(this._contentContainer);

    document.body.appendChild(this._container);
  }

  /**
   * Показать панель с деталями метки
   */
  public show(marker: Marker): void {
    this._currentMarker = marker;
    this.updateContent(marker);
    this._container.style.left = '0';
    this._isVisible = true;
  }

  /**
   * Скрыть панель
   */
  public hide(): void {
    this._container.style.left = '-400px';
    this._isVisible = false;
    this._currentMarker = null;
    
    if (this._onCloseCallback) {
      this._onCloseCallback();
    }
  }

  /**
   * Обновить содержимое панели
   */
  private updateContent(marker: Marker): void {
    const data = marker.data;
    
    this._contentContainer.innerHTML = '';

    // === КНОПКА ФОКУСА (САМАЯ ПЕРВАЯ) ===
    const focusButton = document.createElement('button');
    focusButton.innerHTML = '<i class="fa-solid fa-crosshairs" style="margin-right: 8px;"></i> Фокусироваться на метке';
    focusButton.style.cssText = `
      width: 100%;
      padding: 14px 16px;
      margin-bottom: 20px;
      background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 4px 10px rgba(0, 210, 255, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    focusButton.addEventListener('mouseenter', () => {
      focusButton.style.transform = 'translateY(-2px)';
      focusButton.style.boxShadow = '0 8px 20px rgba(0, 210, 255, 0.5)';
    });

    focusButton.addEventListener('mouseleave', () => {
      focusButton.style.transform = 'translateY(0)';
      focusButton.style.boxShadow = '0 4px 10px rgba(0, 210, 255, 0.3)';
    });

    focusButton.addEventListener('click', () => {
      if (this._currentMarker && this._onFocusCallback) {
        this._onFocusCallback(this._currentMarker);
      }
    });

    this._contentContainer.appendChild(focusButton);

    // === ИКОНКА ===
    if (data.icon) {
      const iconContainer = document.createElement('div');
      iconContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 20px;
      `;
      
      const icon = document.createElement('div');
      icon.textContent = data.icon;
      
      const bgColor = this.getColorAsRgb(data.backgroundColor || new Color3(0.2, 0.6, 0.3));
      
      icon.style.cssText = `
        font-size: 48px;
        background: rgba(255, 255, 255, 0.1);
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid ${bgColor};
      `;
      
      iconContainer.appendChild(icon);
      this._contentContainer.appendChild(iconContainer);
    }

    // === НАЗВАНИЕ ===
    const nameContainer = document.createElement('div');
    nameContainer.style.cssText = `
      margin-bottom: 15px;
    `;
    
    const nameLabel = document.createElement('div');
    nameLabel.textContent = 'Название';
    nameLabel.style.cssText = `
      font-size: 12px;
      color: #aaa;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    
    const nameValue = document.createElement('div');
    nameValue.textContent = data.title || 'Без названия';
    nameValue.style.cssText = `
      font-size: 16px;
      font-weight: 500;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      word-wrap: break-word;
      box-sizing: border-box;
      width: 100%;
    `;
    
    nameContainer.appendChild(nameLabel);
    nameContainer.appendChild(nameValue);
    this._contentContainer.appendChild(nameContainer);

    // === ОПИСАНИЕ ===
    if (data.description) {
      const descContainer = document.createElement('div');
      descContainer.style.cssText = `
        margin-bottom: 15px;
      `;
      
      const descLabel = document.createElement('div');
      descLabel.textContent = 'Описание';
      descLabel.style.cssText = `
        font-size: 12px;
        color: #aaa;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      
      const descValue = document.createElement('textarea');
      descValue.value = data.description;
      descValue.readOnly = true;
      descValue.style.cssText = `
        width: 100%;
        min-height: 80px;
        font-size: 14px;
        line-height: 1.5;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #ddd;
        font-family: inherit;
        resize: vertical;
        outline: none;
        cursor: default;
        overflow-y: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        box-sizing: border-box;
        margin: 0;
      `;
      
      descContainer.appendChild(descLabel);
      descContainer.appendChild(descValue);
      this._contentContainer.appendChild(descContainer);
    }

    // === ЭТАЖ ===
    if (data.floor !== undefined) {
      const floorContainer = document.createElement('div');
      floorContainer.style.cssText = `
        margin-bottom: 15px;
      `;
      
      const floorLabel = document.createElement('div');
      floorLabel.textContent = 'Этаж';
      floorLabel.style.cssText = `
        font-size: 12px;
        color: #aaa;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      
      const floorValue = document.createElement('div');
      floorValue.textContent = `${data.floor}`;
      floorValue.style.cssText = `
        font-size: 14px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        box-sizing: border-box;
        width: 100%;
      `;
      
      floorContainer.appendChild(floorLabel);
      floorContainer.appendChild(floorValue);
      this._contentContainer.appendChild(floorContainer);
    }

    // === КООРДИНАТЫ ===
    const posContainer = document.createElement('div');
    posContainer.style.cssText = `
      margin-bottom: 15px;
    `;
    
    const posLabel = document.createElement('div');
    posLabel.textContent = 'Координаты';
    posLabel.style.cssText = `
      font-size: 12px;
      color: #aaa;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    
    const posValue = document.createElement('div');
    const pos = marker.position;
    posValue.textContent = `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
    posValue.style.cssText = `
      font-size: 14px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      font-family: monospace;
      box-sizing: border-box;
      width: 100%;
    `;
    
    posContainer.appendChild(posLabel);
    posContainer.appendChild(posValue);
    this._contentContainer.appendChild(posContainer);
  }

  /**
   * Преобразует Color3 или массив в CSS RGB строку
   */
  private getColorAsRgb(color: Color3 | number[]): string {
    if (color instanceof Color3) {
      return `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    } else if (Array.isArray(color) && color.length >= 3) {
      return `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`;
    }
    return 'rgb(51, 153, 77)';
  }

  /**
   * Установить колбэк при закрытии
   */
  public setCloseCallback(callback: () => void): void {
    this._onCloseCallback = callback;
  }

  /**
   * Установить колбэк для фокуса на метке
   */
  public setFocusCallback(callback: (marker: Marker) => void): void {
    this._onFocusCallback = callback;
  }

  /**
   * Проверить, видна ли панель
   */
  public get isVisible(): boolean {
    return this._isVisible;
  }

  /**
   * Получить текущую метку
   */
  public get currentMarker(): Marker | null {
    return this._currentMarker;
  }

  /**
   * Очистить ресурсы
   */
  public dispose(): void {
    if (this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}