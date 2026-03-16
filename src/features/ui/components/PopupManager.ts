export type PopupType = 'info' | 'success' | 'error' | 'warning';

export interface PopupOptions {
  message: string;
  type?: PopupType;
  duration?: number; // в миллисекундах, 0 = бесконечно
  closable?: boolean; // можно ли закрыть крестиком
}

export class PopupManager {
  private static _instance: PopupManager;
  private _container: HTMLDivElement;
  private _activePopups: HTMLDivElement[] = []; // Массив активных popup'ов
  private _maxPopups: number = 3; // Максимум одновременных popup'ов
  private _isRemoving: boolean = false; // Флаг, что идёт удаление

  private constructor() {
    this.createContainer();
    this.addAnimationStyles();
  }

  public static getInstance(): PopupManager {
    if (!PopupManager._instance) {
      PopupManager._instance = new PopupManager();
    }
    return PopupManager._instance;
  }

  private createContainer(): void {
    // Контейнер для popup'ов в центре сверху
    this._container = document.createElement('div');
    this._container.id = 'popup-container';
    this._container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 3000;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: auto;
      max-width: 90vw;
    `;
    document.body.appendChild(this._container);
  }

  /**
   * Показать popup
   */
  public show(options: PopupOptions): void {
    const {
      message,
      type = 'info',
      duration = 5000,
      closable = true
    } = options;

    // Если сейчас идёт удаление, ждём немного
    if (this._isRemoving) {
      setTimeout(() => this.show(options), 100);
      return;
    }

    // Проверяем, не превышен ли лимит
    if (this._activePopups.length >= this._maxPopups) {
      // Удаляем самый старый popup
      const oldestPopup = this._activePopups[this._activePopups.length - 1];
      this.hide(oldestPopup);
      
      // Показываем новый с задержкой
      setTimeout(() => this.show(options), 350);
      return;
    }

    // Создаём новый popup
    const popup = this.createPopup(message, type, closable, duration);
    
    // Добавляем в начало контейнера (сверху)
    if (this._container.firstChild) {
      this._container.insertBefore(popup, this._container.firstChild);
    } else {
      this._container.appendChild(popup);
    }
    
    this._activePopups.unshift(popup); // Добавляем в начало массива

    // Анимация появления
    setTimeout(() => {
      popup.style.opacity = '1';
      popup.style.transform = 'translateY(0)';
    }, 10);

    // Автоматическое скрытие
    if (duration > 0) {
      setTimeout(() => {
        this.hide(popup);
      }, duration);
    }

    console.log(`📢 Popup показан: ${type} - ${message}, всего: ${this._activePopups.length}`);
  }

  /**
   * Скрыть конкретный popup
   */
  public hide(popup: HTMLDivElement): void {
    // Находим индекс popup'а
    const index = this._activePopups.indexOf(popup);
    if (index === -1) return;

    this._isRemoving = true;

    // Анимация скрытия
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(-20px)';
    popup.style.pointerEvents = 'none';

    // Удаляем после анимации
    setTimeout(() => {
      // Проверяем, не был ли он уже удалён
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      
      // Удаляем из массива
      this._activePopups.splice(index, 1);
      
      this._isRemoving = false;
      
      console.log(`✅ Popup скрыт, осталось: ${this._activePopups.length}`);
    }, 300);
  }

  /**
   * Скрыть все popup'ы
   */
  public hideAll(): void {
    // Копируем массив, так как он изменится во время итерации
    const popupsToHide = [...this._activePopups];
    popupsToHide.forEach(popup => this.hide(popup));
  }

  private createPopup(message: string, type: PopupType, closable: boolean, duration: number): HTMLDivElement {
    const popup = document.createElement('div');
    
    // Цвета для разных типов
    const colors = {
      info: { bg: 'rgba(0, 210, 255, 0.95)', icon: 'ℹ️', border: 'rgba(0, 210, 255, 0.5)' },
      success: { bg: 'rgba(68, 255, 68, 0.95)', icon: '✅', border: 'rgba(68, 255, 68, 0.5)' },
      error: { bg: 'rgba(255, 68, 68, 0.95)', icon: '❌', border: 'rgba(255, 68, 68, 0.5)' },
      warning: { bg: 'rgba(255, 170, 0, 0.95)', icon: '⚠️', border: 'rgba(255, 170, 0, 0.5)' }
    };

    popup.style.cssText = `
      background: ${colors[type].bg};
      color: white;
      padding: 14px 24px;
      border-radius: 10px;
      font-size: 15px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(5px);
      border: 1px solid ${colors[type].border};
      min-width: 280px;
      max-width: 450px;
      width: fit-content;
      word-wrap: break-word;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(-20px);
      pointer-events: auto;
      cursor: ${closable ? 'pointer' : 'default'};
      font-weight: 500;
      line-height: 1.5;
      margin: 0;
      position: relative;
      z-index: ${3000 + this._activePopups.length}; // Разные z-index
    `;

    // Прогресс-бар
    if (duration > 0) {
      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        width: 100%;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 0 0 10px 10px;
        overflow: hidden;
      `;
      
      const progress = document.createElement('div');
      progress.style.cssText = `
        height: 100%;
        width: 100%;
        background: white;
        animation: shrink ${duration}ms linear forwards;
      `;
      
      progressBar.appendChild(progress);
      popup.appendChild(progressBar);
    }

    // Иконка
    const iconSpan = document.createElement('span');
    iconSpan.textContent = colors[type].icon;
    iconSpan.style.fontSize = '20px';
    iconSpan.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))';
    popup.appendChild(iconSpan);

    // Текст
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    textSpan.style.flex = '1';
    textSpan.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
    popup.appendChild(textSpan);

    // Кнопка закрытия
    if (closable) {
      const closeBtn = document.createElement('span');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = `
        cursor: pointer;
        font-size: 18px;
        opacity: 0.7;
        transition: opacity 0.2s, transform 0.2s, background 0.2s;
        margin-left: 12px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.2);
      `;
      
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.opacity = '1';
        closeBtn.style.transform = 'scale(1.1)';
        closeBtn.style.background = 'rgba(0, 0, 0, 0.3)';
      });
      
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.opacity = '0.7';
        closeBtn.style.transform = 'scale(1)';
        closeBtn.style.background = 'rgba(0, 0, 0, 0.2)';
      });
      
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide(popup);
      });
      
      popup.appendChild(closeBtn);

      // Клик по popup тоже закрывает
      popup.addEventListener('click', (e) => {
        // Не закрываем, если кликнули по крестику
        if (!(e.target as HTMLElement).classList.contains('fa-times') && 
            !(e.target as HTMLElement).parentElement?.classList.contains('fa-times')) {
          this.hide(popup);
        }
      });
    }

    return popup;
  }

  /**
   * Добавить CSS анимацию для прогресс-бара
   */
  private addAnimationStyles(): void {
    // Проверяем, не добавлены ли уже стили
    if (document.getElementById('popup-animation-styles')) return;

    const style = document.createElement('style');
    style.id = 'popup-animation-styles';
    style.textContent = `
      @keyframes shrink {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Быстрые методы для разных типов
   */
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

  /**
   * Получить количество активных popup'ов
   */
  public get count(): number {
    return this._activePopups.length;
  }

  /**
   * Установить максимальное количество popup'ов
   */
  public setMaxPopups(max: number): void {
    this._maxPopups = max;
    while (this._activePopups.length > this._maxPopups) {
      const oldestPopup = this._activePopups[this._activePopups.length - 1];
      this.hide(oldestPopup);
    }
  }
}