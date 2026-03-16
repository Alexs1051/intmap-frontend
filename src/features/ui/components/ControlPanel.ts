import { CameraModeManager } from "../../camera/CameraModeManager";
import { UIEvent, UIEventType } from "../../../shared/types";

export class ControlPanel {
  private _container: HTMLDivElement;
  private _buttons: Map<string, HTMLButtonElement> = new Map();
  private _eventListeners: ((event: UIEvent) => void)[] = [];
  private _isLandscape: boolean = window.innerWidth > window.innerHeight;

  constructor(cameraModeManager: CameraModeManager) {
    this._container = document.createElement("div");
    this.setupContainer();
    this.createButtons();
    this.setupResizeListener();
  }

  private setupContainer(): void {
    this.updateLayout();
    this._container.id = 'control-panel';
    document.body.appendChild(this._container);
  }

  private updateLayout(): void {
    const isLandscape = window.innerWidth > window.innerHeight;
    this._isLandscape = isLandscape;

    if (isLandscape) {
      // Горизонтальное расположение (справа снизу)
      this._container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: row;
        gap: 10px;
        background: rgba(30, 30, 40, 0.8);
        backdrop-filter: blur(10px);
        padding: 15px 20px;
        border-radius: 60px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        max-width: calc(100vw - 40px); /* Учитываем отступы */
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
      `;
    } else {
      // Вертикальное расположение (справа)
      this._container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: rgba(30, 30, 40, 0.8);
        backdrop-filter: blur(10px);
        padding: 15px;
        border-radius: 50px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
      `;
    }

    // Добавляем стили для скроллбара
    this.addScrollbarStyles();
  }

  private addScrollbarStyles(): void {
    const styleId = 'control-panel-scrollbar-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #control-panel::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }
      #control-panel::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      #control-panel::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }
      #control-panel::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
    `;
    document.head.appendChild(style);
  }

  private setupResizeListener(): void {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    
    window.addEventListener('resize', () => {
      // Debounce для оптимизации
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const wasLandscape = this._isLandscape;
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (wasLandscape !== isLandscape) {
          // Меняем расположение только при смене ориентации
          this.updateLayout();
          this.repositionButtons();
        }
      }, 100);
    });
  }

  private repositionButtons(): void {
    // Перемещаем все кнопки в контейнер с новым layout
    this._buttons.forEach(button => {
      if (button.parentNode !== this._container) {
        this._container.appendChild(button);
      }
    });
  }

  private createButtons(): void {
    const buttonsConfig = [
      { 
        id: 'search',
        icon: 'fa-solid fa-search', 
        tooltip: 'Поиск',
        onClick: () => this.emitEvent(UIEventType.SEARCH_TOGGLE)
      },
      { 
        id: '2d', 
        icon: 'fa-solid fa-cube', 
        tooltip: 'Переключить 2D/3D',
        onClick: () => this.emitEvent(UIEventType.CAMERA_MODE_TOGGLE)
      },
      { 
        id: 'reset',
        icon: 'fa-solid fa-rotate-left', 
        tooltip: 'Сброс камеры',
        onClick: () => this.emitEvent(UIEventType.RESET_CAMERA)
      },
      { 
        id: 'walls', 
        icon: 'fa-solid fa-border-all', 
        tooltip: 'Прозрачность стен',
        onClick: () => this.emitEvent(UIEventType.WALLS_TRANSPARENCY_TOGGLE)
      },
      { 
        id: 'view', 
        icon: 'fa-solid fa-building', 
        tooltip: 'Этаж/Здание',
        onClick: () => this.emitEvent(UIEventType.VIEW_MODE_TOGGLE)
      },
      { 
        id: 'floor-up', 
        icon: 'fa-solid fa-arrow-up', 
        tooltip: 'Следующий этаж',
        onClick: () => this.emitEvent(UIEventType.NEXT_FLOOR)
      },
      { 
        id: 'floor-down', 
        icon: 'fa-solid fa-arrow-down', 
        tooltip: 'Предыдущий этаж',
        onClick: () => this.emitEvent(UIEventType.PREVIOUS_FLOOR)
      }
    ];

    buttonsConfig.forEach(config => {
      const button = this.createButton(config.icon, config.onClick, config.tooltip);
      button.id = `btn-${config.id}`;
      this._buttons.set(config.id, button);
      this._container.appendChild(button);
    });
  }

  private createButton(iconClass: string, onClick: () => void, tooltip: string): HTMLButtonElement {
    const button = document.createElement("button");
    
    const icon = document.createElement("i");
    icon.className = iconClass;
    button.appendChild(icon);
    
    // Базовые стили для кнопки
    button.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: none;
      background: rgba(60, 60, 80, 0.6);
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
      margin: 0;
      padding: 0;
    `;
    
    button.title = tooltip;
    
    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(80, 80, 120, 0.8)';
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      if (button.classList.contains('active')) {
        button.style.background = 'rgba(100, 100, 200, 0.9)';
      } else {
        button.style.background = 'rgba(60, 60, 80, 0.6)';
      }
      button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', onClick);
    
    return button;
  }

  private emitEvent(type: UIEventType): void {
    const event: UIEvent = { type };
    this._eventListeners.forEach(listener => listener(event));
  }

  public addEventListener(listener: (event: UIEvent) => void): void {
    this._eventListeners.push(listener);
  }

  public updateButtonState(buttonId: string, isActive: boolean): void {
    const button = this._buttons.get(buttonId);
    if (!button) return;

    if (isActive) {
      button.classList.add('active');
      button.style.background = 'rgba(100, 100, 200, 0.9)';
      button.style.boxShadow = '0 0 10px rgba(100, 100, 200, 0.5)';
    } else {
      button.classList.remove('active');
      button.style.background = 'rgba(60, 60, 80, 0.6)';
      button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    }
  }

  public updateFloorButtons(currentFloor: number, maxFloor: number): void {
    const upButton = this._buttons.get('floor-up');
    const downButton = this._buttons.get('floor-down');
    
    if (!upButton || !downButton) return;
    
    const isFloorMode = currentFloor > 0;
    
    // Обновляем кнопку "вверх"
    if (isFloorMode) {
      upButton.style.opacity = currentFloor < maxFloor ? '1' : '0.3';
      upButton.style.pointerEvents = currentFloor < maxFloor ? 'auto' : 'none';
      upButton.title = currentFloor < maxFloor ? 'Следующий этаж' : 'Это последний этаж';
    } else {
      upButton.style.opacity = '0.3';
      upButton.style.pointerEvents = 'none';
      upButton.title = 'Сначала включите режим этажа';
    }
    
    // Обновляем кнопку "вниз"
    if (isFloorMode) {
      downButton.style.opacity = currentFloor > 1 ? '1' : '0.3';
      downButton.style.pointerEvents = currentFloor > 1 ? 'auto' : 'none';
      downButton.title = currentFloor > 1 ? 'Предыдущий этаж' : 'Это первый этаж';
    } else {
      downButton.style.opacity = '0.3';
      downButton.style.pointerEvents = 'none';
      downButton.title = 'Сначала включите режим этажа';
    }
  }

  /**
   * Получить контейнер (для отладки)
   */
  public get container(): HTMLDivElement {
    return this._container;
  }

  public dispose(): void {
    this._eventListeners = [];
    
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    
    this._buttons.clear();
  }
}