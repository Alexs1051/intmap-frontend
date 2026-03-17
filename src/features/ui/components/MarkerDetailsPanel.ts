import { Marker } from "../../markers/Marker";
import { Color3 } from "@babylonjs/core";
import { marked } from 'marked';
import { logger } from "../../../core/logger/Logger";
import '../../../styles/components/marker-details-panel.css';

marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Переносы строк
  pedantic: false, // Не быть строгим
  silent: false, // Показывать ошибки
  async: false // Синхронный режим
});

const detailsLogger = logger.getLogger('MarkerDetailsPanel');

export class MarkerDetailsPanel {
  private _container: HTMLDivElement;
  private _contentContainer: HTMLDivElement;
  private _isVisible: boolean = false;
  private _currentMarker: Marker | null = null;
  private _onCloseCallback: (() => void) | null = null;
  private _onFocusCallback: ((marker: Marker) => void) | null = null;
  
  private _fromActive: boolean = false;
  private _toActive: boolean = false;

  constructor() {
    this.createPanel();
  }

  private createPanel(): void {
    this._container = document.createElement('div');
    this._container.id = 'marker-details-panel';
    this._container.className = 'marker-details-panel';

    const header = document.createElement('div');
    header.className = 'marker-details-header';

    const title = document.createElement('h2');
    title.className = 'marker-details-title';
    title.textContent = 'Детали метки';

    const closeButton = document.createElement('button');
    closeButton.className = 'marker-details-close';
    closeButton.innerHTML = '✕';
    closeButton.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeButton);
    this._container.appendChild(header);

    this._contentContainer = document.createElement('div');
    this._contentContainer.className = 'marker-details-content';
    this._container.appendChild(this._contentContainer);

    document.body.appendChild(this._container);
  }

  public show(marker: Marker): void {
    this._currentMarker = marker;
    this._fromActive = false;
    this._toActive = false;
    this.updateContent(marker);
    this._container.classList.add('visible');
    this._isVisible = true;
    detailsLogger.debug(`Показана панель для маркера: ${marker.data.title}`);
  }

  public hide(): void {
    this._container.classList.remove('visible');
    this._isVisible = false;
    this._currentMarker = null;
    this._onCloseCallback?.();
    detailsLogger.debug("Панель скрыта");
  }

  private updateContent(marker: Marker): void {
    const data = marker.data;
    this._contentContainer.innerHTML = '';

    // Кнопки маршрута
    this._contentContainer.appendChild(this.createRouteButtons());

    // Кнопка фокуса
    this._contentContainer.appendChild(this.createFocusButton());

    // Название с иконкой
    this._contentContainer.appendChild(this.createTitleSection(data));

    // Описание с Markdown
    if (data.description) {
      this._contentContainer.appendChild(this.createDescriptionSection(data.description));
    }

    // Этаж
    if (data.floor !== undefined) {
      this._contentContainer.appendChild(this.createInfoSection('Этаж', `${data.floor}`));
    }

    // Координаты
    this._contentContainer.appendChild(this.createInfoSection(
      'Координаты',
      `X: ${marker.position.x.toFixed(1)}, Y: ${marker.position.y.toFixed(1)}, Z: ${marker.position.z.toFixed(1)}`,
      true
    ));
  }

  private createRouteButtons(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'route-buttons';

    const fromButton = document.createElement('button');
    fromButton.className = `route-button ${this._fromActive ? 'active' : ''}`;
    fromButton.textContent = 'Отсюда';
    fromButton.addEventListener('click', () => this.toggleFromButton());

    const toButton = document.createElement('button');
    toButton.className = `route-button ${this._toActive ? 'active' : ''}`;
    toButton.textContent = 'Сюда';
    toButton.addEventListener('click', () => this.toggleToButton());

    container.appendChild(fromButton);
    container.appendChild(toButton);
    return container;
  }

  private createFocusButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'focus-button';
    button.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Фокусироваться на метке';

    button.addEventListener('click', () => {
      if (this._currentMarker && this._onFocusCallback) {
        this._onFocusCallback(this._currentMarker);
      }
    });

    return button;
  }

  private createTitleSection(data: any): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'title-section';

    const wrapper = document.createElement('div');
    wrapper.className = 'title-wrapper';

    const label = document.createElement('div');
    label.className = 'title-label';
    label.textContent = 'Название';

    const value = document.createElement('div');
    value.className = 'title-value';
    value.textContent = data.title || 'Без названия';

    wrapper.appendChild(label);
    wrapper.appendChild(value);
    container.appendChild(wrapper);

    if (data.icon) {
      const icon = document.createElement('div');
      icon.className = 'marker-icon';
      icon.textContent = data.icon;
      icon.style.borderColor = this.getColorAsRgb(data.backgroundColor || new Color3(0.2, 0.6, 0.3));
      container.appendChild(icon);
    }

    return container;
  }

  private createDescriptionSection(description: string): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'description-section';

    const label = document.createElement('div');
    label.className = 'description-label';
    label.textContent = 'Описание';

    // Конвертируем Markdown в HTML
    const htmlContent = marked.parse(description) as string;
    
    const value = document.createElement('div');
    value.className = 'description-markdown';
    value.innerHTML = htmlContent;

    container.appendChild(label);
    container.appendChild(value);
    return container;
  }

  private createInfoSection(labelText: string, valueText: string, monospace: boolean = false): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'info-section';

    const label = document.createElement('div');
    label.className = 'info-label';
    label.textContent = labelText;

    const value = document.createElement('div');
    value.className = `info-value ${monospace ? 'monospace' : ''}`;
    value.textContent = valueText;

    container.appendChild(label);
    container.appendChild(value);
    return container;
  }

  private toggleFromButton(): void {
    this._fromActive = !this._fromActive;
    if (this._fromActive) this._toActive = false;
    this.updateContent(this._currentMarker!);
    detailsLogger.debug(`Отсюда: ${this._fromActive}`);
  }

  private toggleToButton(): void {
    this._toActive = !this._toActive;
    if (this._toActive) this._fromActive = false;
    this.updateContent(this._currentMarker!);
    detailsLogger.debug(`Сюда: ${this._toActive}`);
  }

  private getColorAsRgb(color: Color3 | number[]): string {
    if (color instanceof Color3) {
      return `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    }
    if (Array.isArray(color) && color.length >= 3) {
      return `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`;
    }
    return 'rgb(51, 153, 77)';
  }

  public setCloseCallback(callback: () => void): void {
    this._onCloseCallback = callback;
  }

  public setFocusCallback(callback: (marker: Marker) => void): void {
    this._onFocusCallback = callback;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public get currentMarker(): Marker | null {
    return this._currentMarker;
  }

  public get routeState(): { from: boolean; to: boolean } {
    return { from: this._fromActive, to: this._toActive };
  }

  public dispose(): void {
    if (this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}