import '../../../styles/components/popup-manager.css';

export type PopupType = 'info' | 'success' | 'error' | 'warning';

export interface PopupOptions {
  message: string;
  type?: PopupType;
  duration?: number;
  closable?: boolean;
}

export class PopupManager {
  private static _instance: PopupManager;
  private _container: HTMLDivElement;
  private _activePopups: HTMLDivElement[] = [];
  private _maxPopups: number = 3;
  private _isRemoving: boolean = false;

  private constructor() {
    this.createContainer();
  }

  public static getInstance(): PopupManager {
    if (!PopupManager._instance) {
      PopupManager._instance = new PopupManager();
    }
    return PopupManager._instance;
  }

  private createContainer(): void {
    this._container = document.createElement('div');
    this._container.id = 'popup-container';
    this._container.className = 'popup-container';
    document.body.appendChild(this._container);
  }

  public show(options: PopupOptions): void {
    const { message, type = 'info', duration = 5000, closable = true } = options;

    if (this._isRemoving) {
      setTimeout(() => this.show(options), 100);
      return;
    }

    if (this._activePopups.length >= this._maxPopups) {
      const oldest = this._activePopups[this._activePopups.length - 1];
      this.hide(oldest);
      setTimeout(() => this.show(options), 350);
      return;
    }

    const popup = this.createPopup(message, type, closable, duration);
    
    if (this._container.firstChild) {
      this._container.insertBefore(popup, this._container.firstChild);
    } else {
      this._container.appendChild(popup);
    }
    
    this._activePopups.unshift(popup);

    setTimeout(() => {
      popup.classList.add('visible');
    }, 10);

    if (duration > 0) {
      setTimeout(() => this.hide(popup), duration);
    }
  }

  public hide(popup: HTMLDivElement): void {
    const index = this._activePopups.indexOf(popup);
    if (index === -1) return;

    this._isRemoving = true;
    popup.classList.remove('visible');

    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      this._activePopups.splice(index, 1);
      this._isRemoving = false;
    }, 300);
  }

  public hideAll(): void {
    [...this._activePopups].forEach(popup => this.hide(popup));
  }

  private createPopup(message: string, type: PopupType, closable: boolean, duration: number): HTMLDivElement {
    const popup = document.createElement('div');
    popup.className = `popup ${type}`;

    if (duration > 0) {
      const progressBar = document.createElement('div');
      progressBar.className = 'popup-progress';
      
      const progress = document.createElement('div');
      progress.className = 'popup-progress-bar';
      progress.style.animation = `shrink ${duration}ms linear forwards`;
      
      progressBar.appendChild(progress);
      popup.appendChild(progressBar);
    }

    const iconSpan = document.createElement('span');
    iconSpan.className = 'popup-icon';
    iconSpan.textContent = this.getIconForType(type);

    const textSpan = document.createElement('span');
    textSpan.className = 'popup-text';
    textSpan.textContent = message;

    popup.appendChild(iconSpan);
    popup.appendChild(textSpan);

    if (closable) {
      const closeBtn = document.createElement('span');
      closeBtn.className = 'popup-close';
      closeBtn.innerHTML = '✕';
      
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide(popup);
      });
      
      popup.appendChild(closeBtn);

      popup.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).classList.contains('popup-close')) {
          this.hide(popup);
        }
      });
    }

    return popup;
  }

  private getIconForType(type: PopupType): string {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };
    return icons[type];
  }

  public info(message: string, duration: number = 5000): void {
    this.show({ message, type: 'info', duration });
  }

  public success(message: string, duration: number = 5000): void {
    this.show({ message, type: 'success', duration });
  }

  public error(message: string, duration: number = 8000): void {
    this.show({ message, type: 'error', duration });
  }

  public warning(message: string, duration: number = 6000): void {
    this.show({ message, type: 'warning', duration });
  }

  public get count(): number {
    return this._activePopups.length;
  }

  public setMaxPopups(max: number): void {
    this._maxPopups = max;
    while (this._activePopups.length > this._maxPopups) {
      this.hide(this._activePopups[this._activePopups.length - 1]);
    }
  }
}