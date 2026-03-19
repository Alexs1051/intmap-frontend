import { CameraModeManager } from "../../camera/CameraModeManager";
import { UIEvent, UIEventType } from "../../../shared/types";
import { logger } from "../../../core/logger/Logger";
import '../../../styles/components/control-panel.css';

const panelLogger = logger.getLogger('ControlPanel');

export interface UserInfo {
  isAuthenticated: boolean;
  username?: string;
  role?: string;
}

export class ControlPanel {
  private _container: HTMLDivElement;
  private _buttons: Map<string, HTMLButtonElement> = new Map();
  private _eventListeners: ((event: UIEvent) => void)[] = [];
  private _isLandscape: boolean = window.innerWidth > window.innerHeight;
  
  // Состояния
  private _userInfo: UserInfo = { isAuthenticated: false };
  private _cameraModeManager: CameraModeManager;

  constructor(cameraModeManager: CameraModeManager) {
    this._cameraModeManager = cameraModeManager;
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

  private createButton(iconPath: string, tooltip: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = 'control-panel-button';
    
    const img = document.createElement("img");
    img.src = iconPath;
    img.alt = tooltip;
    img.width = 40;
    img.height = 40;
    
    button.appendChild(img);
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

  private createButtons(): void {
    const buttonsConfig: Array<{
      id: string;
      iconDefault: string;
      iconActive?: string;
      tooltip: string;
      type: UIEventType;
    }> = [
      { 
        id: 'floor-up', 
        iconDefault: '/icons/circle-arrow-up.png',
        tooltip: 'Следующий этаж', 
        type: UIEventType.NEXT_FLOOR 
      },
      { 
        id: 'floor-down', 
        iconDefault: '/icons/circle-arrow-down.png',
        tooltip: 'Предыдущий этаж', 
        type: UIEventType.PREVIOUS_FLOOR 
      },
      { 
        id: 'view', 
        iconDefault: '/icons/layers-off.png',
        iconActive: '/icons/layers.png',
        tooltip: 'Этаж/Здание', 
        type: UIEventType.VIEW_MODE_TOGGLE 
      },
      { 
        id: 'walls', 
        iconDefault: '/icons/eye-off.png',
        iconActive: '/icons/eye.png',
        tooltip: 'Прозрачность стен', 
        type: UIEventType.WALLS_TRANSPARENCY_TOGGLE 
      },
      { 
        id: 'mode', 
        iconDefault: '/icons/mode-3d.png',
        iconActive: '/icons/mode-2d.png',
        tooltip: 'Переключить 2D/3D', 
        type: UIEventType.CAMERA_MODE_TOGGLE 
      },
      {
        id: 'graph',
        iconDefault: '/icons/graph.png',
        tooltip: 'Показать граф связей',
        type: UIEventType.TOGGLE_GRAPH
      },
      { 
        id: 'reset', 
        iconDefault: '/icons/reset.png',
        tooltip: 'Сброс камеры', 
        type: UIEventType.RESET_CAMERA 
      },
      { 
        id: 'search', 
        iconDefault: '/icons/search.png',
        tooltip: 'Поиск', 
        type: UIEventType.SEARCH_TOGGLE 
      },
      { 
        id: 'auth', 
        iconDefault: '/icons/lock.png',
        tooltip: 'Не авторизован',
        type: UIEventType.AUTH_TOGGLE
      }
    ];

    buttonsConfig.forEach(config => {
      const button = this.createButton(config.iconDefault, config.tooltip);
      button.id = `btn-${config.id}`;
      
      // Сохраняем пути к иконкам в dataset
      button.dataset.defaultIcon = config.iconDefault;
      if (config.iconActive) {
        button.dataset.activeIcon = config.iconActive;
      }
      
      button.addEventListener('click', () => {
        panelLogger.debug(`Клик по кнопке: ${config.id}`);
        this.emitEvent(config.type);
      });
      
      this._buttons.set(config.id, button);
      this._container.appendChild(button);
    });

    // Инициализируем состояние кнопки mode на основе текущего режима камеры
    this.updateButtonState('mode', this._cameraModeManager.cameraMode === '2d');

    panelLogger.debug(`Создано ${this._buttons.size} кнопок`);
  }

  private updateButtonIcon(buttonId: string, isActive: boolean): void {
    const button = this._buttons.get(buttonId);
    if (!button) return;
    
    const img = button.querySelector('img');
    if (!img) return;
    
    const defaultIcon = button.dataset.defaultIcon;
    const activeIcon = button.dataset.activeIcon;
    
    if (isActive && activeIcon) {
      img.src = activeIcon;
    } else if (defaultIcon) {
      img.src = defaultIcon;
    }
  }

  public updateButtonState(buttonId: string, isActive: boolean): void {
    const button = this._buttons.get(buttonId);
    if (!button) {
      panelLogger.warn(`Кнопка ${buttonId} не найдена`);
      return;
    }

    button.classList.toggle('active', isActive);
    
    if (isActive) {
      button.style.background = 'rgba(100, 100, 200, 0.9)';
      button.style.boxShadow = '0 0 10px rgba(100, 100, 200, 0.5)';
    } else {
      button.style.background = 'rgba(60, 60, 80, 0.6)';
      button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    }
    
    if (buttonId === 'mode' || buttonId === 'walls' || buttonId === 'view') {
      this.updateButtonIcon(buttonId, isActive);
    }
  }

  public setAuthState(userInfo: UserInfo): void {
    this._userInfo = userInfo;
    
    const authButton = this._buttons.get('auth');
    if (!authButton) return;
    
    const img = authButton.querySelector('img');
    if (img) {
      img.src = userInfo.isAuthenticated ? '/icons/lock-open.png' : '/icons/lock.png';
    }
    
    authButton.title = userInfo.isAuthenticated 
      ? `${userInfo.username} (${userInfo.role})`
      : 'Не авторизован';
    
    panelLogger.debug(`Состояние авторизации обновлено: ${userInfo.isAuthenticated}`);
  }

  public updateFloorButtons(currentFloor: number, maxFloor: number): void {
    const upButton = this._buttons.get('floor-up');
    const downButton = this._buttons.get('floor-down');
    if (!upButton || !downButton) {
      panelLogger.warn('Кнопки этажей не найдены');
      return;
    }
    
    const isFloorMode = currentFloor > 0;
    
    // Обновляем кнопку вверх
    upButton.style.opacity = isFloorMode ? '1' : '0.3';
    upButton.style.pointerEvents = isFloorMode ? 'auto' : 'none';
    
    if (isFloorMode) {
      upButton.style.opacity = currentFloor < maxFloor ? '1' : '0.3';
      upButton.style.pointerEvents = currentFloor < maxFloor ? 'auto' : 'none';
      upButton.title = currentFloor < maxFloor ? 'Следующий этаж' : 'Это последний этаж';
    } else {
      upButton.title = 'Сначала включите режим этажа';
    }
    
    // Обновляем кнопку вниз
    downButton.style.opacity = isFloorMode ? '1' : '0.3';
    downButton.style.pointerEvents = isFloorMode ? 'auto' : 'none';
    
    if (isFloorMode) {
      downButton.style.opacity = currentFloor > 1 ? '1' : '0.3';
      downButton.style.pointerEvents = currentFloor > 1 ? 'auto' : 'none';
      downButton.title = currentFloor > 1 ? 'Предыдущий этаж' : 'Это первый этаж';
    } else {
      downButton.title = 'Сначала включите режим этажа';
    }

    panelLogger.debug(`Обновлены кнопки этажей: floor=${currentFloor}, max=${maxFloor}, mode=${isFloorMode}`);
  }

  private emitEvent(type: UIEventType): void {
    const event: UIEvent = { type };
    panelLogger.debug(`Отправка события: ${UIEventType[type]}`);
    this._eventListeners.forEach(listener => listener(event));
  }

  public addEventListener(listener: (event: UIEvent) => void): void {
    this._eventListeners.push(listener);
  }

  public dispose(): void {
    this._eventListeners = [];
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._buttons.clear();
  }
}