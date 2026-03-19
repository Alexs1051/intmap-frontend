import { Marker } from "../../markers/Marker";
import { marked } from 'marked';
import { logger } from "../../../core/logger/Logger";
import { AnyMarkerData, MarkerType, RGBA } from "../../markers/types";
import { rgbaToCss } from "../../markers/utils/iconUtils";
import '../../../styles/components/marker-details-panel.css';

marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
  silent: false,
  async: false
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
  private _onFromToggle: ((marker: Marker, type: 'from') => void) | null = null;
  private _onToToggle: ((marker: Marker, type: 'to') => void) | null = null;

  constructor() {
    this.createPanel();
  }

  public setRouteCallbacks(
    onFromToggle: (marker: Marker, type: 'from') => void,
    onToToggle: (marker: Marker, type: 'to') => void
  ): void {
    this._onFromToggle = onFromToggle;
    this._onToToggle = onToToggle;
  }

  public updateFromState(active: boolean): void {
    if (this._fromActive !== active) {
      this._fromActive = active;
      this.updateRouteButtons();
    }
  }

  public updateToState(active: boolean): void {
    if (this._toActive !== active) {
      this._toActive = active;
      this.updateRouteButtons();
    }
  }

  private updateRouteButtons(): void {
    // Обновляем только кнопки, не пересоздавая весь контент
    const routeButtons = this._contentContainer.querySelector('.route-buttons');
    if (routeButtons) {
      const fromButton = routeButtons.children[0] as HTMLButtonElement;
      const toButton = routeButtons.children[1] as HTMLButtonElement;
      
      fromButton.className = `route-button ${this._fromActive ? 'active' : ''}`;
      toButton.className = `route-button ${this._toActive ? 'active' : ''}`;
    }
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
    this.updateContent(marker);
    this._container.classList.add('visible');
    this._isVisible = true;
    detailsLogger.debug(`Показана панель для маркера: ${marker.data.name}`);
  }

  public hide(): void {
    this._container.classList.remove('visible');
    this._isVisible = false;
    this._currentMarker = null;
    this._onCloseCallback?.();
    detailsLogger.debug("Панель скрыта");
  }

  private updateContent(marker: Marker): void {
    const data = marker.data as AnyMarkerData;
    this._contentContainer.innerHTML = '';

    // Кнопки маршрута
    this._contentContainer.appendChild(this.createRouteButtons());

    // Кнопка фокуса
    this._contentContainer.appendChild(this.createFocusButton());

    // Название с иконкой справа
    this._contentContainer.appendChild(this.createTitleSection(data));

    // Описание с Markdown
    if ('description' in data && data.description) {
      this._contentContainer.appendChild(this.createDescriptionSection(data.description));
    }

    // QR-код для FLAG
    if (data.type === MarkerType.FLAG && 'qr' in data && data.qr) {
      this._contentContainer.appendChild(this.createQRCodeSection(data.qr));
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
    fromButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Clicked "Отсюда" button', this._currentMarker?.data.name);
      if (this._currentMarker && this._onFromToggle) {
        this._onFromToggle(this._currentMarker, 'from');
      } else {
        console.warn('Cannot toggle "Отсюда" - missing callback or marker');
      }
    });

    const toButton = document.createElement('button');
    toButton.className = `route-button ${this._toActive ? 'active' : ''}`;
    toButton.textContent = 'Сюда';
    toButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Clicked "Сюда" button', this._currentMarker?.data.name);
      if (this._currentMarker && this._onToToggle) {
        this._onToToggle(this._currentMarker, 'to');
      } else {
        console.warn('Cannot toggle "Сюда" - missing callback or marker');
      }
    });

    container.appendChild(fromButton);
    container.appendChild(toButton);
    return container;
  }

  private createFocusButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'focus-button';
    button.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Фокусироваться на метке';

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._currentMarker && this._onFocusCallback) {
        this._onFocusCallback(this._currentMarker);
      }
    });

    return button;
  }

  private createTitleSection(data: AnyMarkerData): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'title-section';
    
    container.style.borderLeftColor = rgbaToCss(data.backgroundColor);

    const textContainer = document.createElement('div');
    textContainer.className = 'title-text-container';

    const label = document.createElement('div');
    label.className = 'title-label';
    label.textContent = 'Название';

    const value = document.createElement('div');
    value.className = 'title-value';
    value.textContent = data.name;

    textContainer.appendChild(label);
    textContainer.appendChild(value);

    const iconCircle = document.createElement('div');
    iconCircle.className = 'title-icon-circle';
    iconCircle.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
    
    const icon = document.createElement('span');
    icon.className = 'title-icon';
    icon.textContent = data.iconName || 'location_on';
    icon.style.color = rgbaToCss(data.textColor);
    icon.style.fontFamily = "'Material Icons', 'Material Symbols Outlined'";
    
    iconCircle.appendChild(icon);
    
    container.appendChild(textContainer);
    container.appendChild(iconCircle);

    return container;
  }

  private createDescriptionSection(description: string): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'description-section';

    const label = document.createElement('div');
    label.className = 'description-label';
    label.textContent = 'Описание';

    const htmlContent = marked.parse(description) as string;
    
    const value = document.createElement('div');
    value.className = 'description-markdown';
    value.innerHTML = htmlContent;

    container.appendChild(label);
    container.appendChild(value);
    return container;
  }

  private createQRCodeSection(qr: string): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'qr-section';

    const label = document.createElement('div');
    label.className = 'qr-label';
    label.textContent = 'QR-код';

    const qrContainer = document.createElement('div');
    qrContainer.className = 'qr-container';

    const qrLink = document.createElement('a');
    qrLink.href = qr;
    qrLink.target = '_blank';
    qrLink.textContent = 'Перейти по ссылке';
    qrLink.className = 'qr-link';

    qrContainer.appendChild(qrLink);
    container.appendChild(label);
    container.appendChild(qrContainer);

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