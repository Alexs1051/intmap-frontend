import { CameraModeManager } from "../../camera/CameraModeManager";
import { UIEvent, UIEventType } from "../../../shared/types";
import '../../../styles/components/control-panel.css';

export class ControlPanel {
  private _container: HTMLDivElement;
  private _buttons: Map<string, HTMLButtonElement> = new Map();
  private _eventListeners: ((event: UIEvent) => void)[] = [];
  private _isLandscape: boolean = window.innerWidth > window.innerHeight;

  constructor(cameraModeManager: CameraModeManager) {
    this._container = document.createElement("div");
    this._container.id = 'control-panel';
    this._container.className = 'control-panel';
    this.updateLayout();
    this.createButtons();
    this.setupResizeListener();
    document.body.appendChild(this._container);
  }

  private updateLayout(): void {
    this._isLandscape = window.innerWidth > window.innerHeight;
    this._container.classList.toggle('landscape', this._isLandscape);
    this._container.classList.toggle('portrait', !this._isLandscape);
  }

  private setupResizeListener(): void {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const isLandscape = window.innerWidth > window.innerHeight;
        if (this._isLandscape !== isLandscape) {
          this.updateLayout();
          this.repositionButtons();
        }
      }, 100);
    });
  }

  private repositionButtons(): void {
    this._buttons.forEach(button => {
      if (button.parentNode !== this._container) {
        this._container.appendChild(button);
      }
    });
  }

  private createButtons(): void {
    const buttonsConfig: Array<{
      id: string;
      icon: string;
      tooltip: string;
      type: UIEventType;
    }> = [
      { id: 'search', icon: 'fa-solid fa-search', tooltip: 'Поиск', type: UIEventType.SEARCH_TOGGLE },
      { id: '2d', icon: 'fa-solid fa-cube', tooltip: 'Переключить 2D/3D', type: UIEventType.CAMERA_MODE_TOGGLE },
      { id: 'reset', icon: 'fa-solid fa-rotate-left', tooltip: 'Сброс камеры', type: UIEventType.RESET_CAMERA },
      { id: 'walls', icon: 'fa-solid fa-border-all', tooltip: 'Прозрачность стен', type: UIEventType.WALLS_TRANSPARENCY_TOGGLE },
      { id: 'view', icon: 'fa-solid fa-building', tooltip: 'Этаж/Здание', type: UIEventType.VIEW_MODE_TOGGLE },
      { id: 'floor-up', icon: 'fa-solid fa-arrow-up', tooltip: 'Следующий этаж', type: UIEventType.NEXT_FLOOR },
      { id: 'floor-down', icon: 'fa-solid fa-arrow-down', tooltip: 'Предыдущий этаж', type: UIEventType.PREVIOUS_FLOOR }
    ];

    buttonsConfig.forEach(config => {
      const button = this.createButton(config.icon, config.tooltip);
      button.addEventListener('click', () => this.emitEvent(config.type));
      button.dataset.id = config.id;
      this._buttons.set(config.id, button);
      this._container.appendChild(button);
    });
  }

  private createButton(iconClass: string, tooltip: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = 'control-panel-button';
    button.innerHTML = `<i class="${iconClass}"></i>`;
    button.title = tooltip;
    
    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(80, 80, 120, 0.8)';
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => this.updateButtonAppearance(button));
    
    return button;
  }

  private updateButtonAppearance(button: HTMLButtonElement): void {
    button.style.transform = 'scale(1)';
    if (button.classList.contains('active')) {
      button.style.background = 'rgba(100, 100, 200, 0.9)';
    } else {
      button.style.background = 'rgba(60, 60, 80, 0.6)';
    }
  }

  private emitEvent(type: UIEventType): void {
    this._eventListeners.forEach(listener => listener({ type }));
  }

  public addEventListener(listener: (event: UIEvent) => void): void {
    this._eventListeners.push(listener);
  }

  public updateButtonState(buttonId: string, isActive: boolean): void {
    const button = this._buttons.get(buttonId);
    if (!button) return;

    button.classList.toggle('active', isActive);
    button.style.background = isActive 
      ? 'rgba(100, 100, 200, 0.9)'
      : 'rgba(60, 60, 80, 0.6)';
    button.style.boxShadow = isActive
      ? '0 0 10px rgba(100, 100, 200, 0.5)'
      : '0 2px 4px rgba(0, 0, 0, 0.2)';
  }

  public updateFloorButtons(currentFloor: number, maxFloor: number): void {
    const upButton = this._buttons.get('floor-up');
    const downButton = this._buttons.get('floor-down');
    
    if (!upButton || !downButton) return;
    
    const isFloorMode = currentFloor > 0;
    
    if (isFloorMode) {
      const canGoUp = currentFloor < maxFloor;
      const canGoDown = currentFloor > 1;
      
      upButton.style.opacity = canGoUp ? '1' : '0.3';
      upButton.style.pointerEvents = canGoUp ? 'auto' : 'none';
      upButton.title = canGoUp ? 'Следующий этаж' : 'Это последний этаж';
      
      downButton.style.opacity = canGoDown ? '1' : '0.3';
      downButton.style.pointerEvents = canGoDown ? 'auto' : 'none';
      downButton.title = canGoDown ? 'Предыдущий этаж' : 'Это первый этаж';
    } else {
      upButton.style.opacity = '0.3';
      upButton.style.pointerEvents = 'none';
      upButton.title = 'Сначала включите режим этажа';
      
      downButton.style.opacity = '0.3';
      downButton.style.pointerEvents = 'none';
      downButton.title = 'Сначала включите режим этажа';
    }
  }

  public dispose(): void {
    this._eventListeners = [];
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._buttons.clear();
  }
}