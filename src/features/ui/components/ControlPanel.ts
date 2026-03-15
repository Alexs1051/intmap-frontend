import { CameraModeManager } from "../../camera/CameraModeManager";
import { UIEvent, UIEventType, CameraMode } from "../../../shared/types";

export class ControlPanel {
  private _container: HTMLDivElement;
  private _buttons: Map<string, HTMLButtonElement> = new Map();
  private _eventListeners: ((event: UIEvent) => void)[] = [];

  constructor(cameraModeManager: CameraModeManager) {
    this._container = document.createElement("div");
    this.setupContainer();
    this.createButtons();
  }

  private setupContainer(): void {
    this._container.style.cssText = `
      position: absolute;
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
    `;
    document.body.appendChild(this._container);
  }

  private createButtons(): void {
    const buttonsConfig = [
      { 
        id: '2d', 
        icon: 'fa-solid fa-cube', 
        tooltip: 'Переключить 2D/3D',
        onClick: () => this.emitEvent(UIEventType.CAMERA_MODE_TOGGLE)
      },
      { 
        id: 'reset',   // <-- Вернули
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
      this._buttons.set(config.id, button);
    });
  }

  private createButton(iconClass: string, onClick: () => void, tooltip: string): HTMLButtonElement {
    const button = document.createElement("button");
    
    const icon = document.createElement("i");
    icon.className = iconClass;
    button.appendChild(icon);
    
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
    
    this._container.appendChild(button);
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
    
    if (upButton) {
      if (maxFloor === 0) {
        upButton.style.opacity = '0.5';
        upButton.style.pointerEvents = 'none';
      } else {
        upButton.style.opacity = currentFloor < maxFloor ? '1' : '0.5';
        upButton.style.pointerEvents = currentFloor < maxFloor ? 'auto' : 'none';
      }
    }
    
    if (downButton) {
      if (maxFloor === 0) {
        downButton.style.opacity = '0.5';
        downButton.style.pointerEvents = 'none';
      } else {
        downButton.style.opacity = currentFloor > 1 ? '1' : '0.5';
        downButton.style.pointerEvents = currentFloor > 1 ? 'auto' : 'none';
      }
    }
  }
}