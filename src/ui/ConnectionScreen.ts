export class ConnectionScreen {
  private _container: HTMLDivElement;
  private _statusIcon: HTMLDivElement;
  private _statusText: HTMLParagraphElement;
  private _retryButton: HTMLButtonElement;
  private _isVisible: boolean = false;
  private _retryCallback: (() => void) | null = null;

  constructor() {
    this.createConnectionScreen();
  }

  private createConnectionScreen(): void {
    this._container = document.createElement('div');
    this._container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(5px);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 2500;
      font-family: 'Arial', sans-serif;
    `;

    // Иконка статуса (анимированная)
    this._statusIcon = document.createElement('div');
    this._statusIcon.style.cssText = `
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 4px solid #ff4444;
      border-top-color: transparent;
      animation: spin 1s linear infinite;
      margin-bottom: 30px;
    `;
    this._container.appendChild(this._statusIcon);

    // Добавляем анимацию
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    // Статус
    this._statusText = document.createElement('p');
    this._statusText.style.cssText = `
      color: white;
      font-size: 18px;
      margin-bottom: 20px;
      text-align: center;
      max-width: 400px;
      line-height: 1.5;
    `;
    this._statusText.textContent = 'Соединение прервано. Попытка переподключения...';
    this._container.appendChild(this._statusText);

    // Кнопка повторной попытки
    this._retryButton = document.createElement('button');
    this._retryButton.style.cssText = `
      padding: 12px 30px;
      background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    this._retryButton.textContent = 'Повторить попытку';
    
    // Hover эффект
    this._retryButton.addEventListener('mouseenter', () => {
      this._retryButton.style.transform = 'scale(1.05)';
      this._retryButton.style.boxShadow = '0 6px 20px rgba(0, 210, 255, 0.4)';
    });
    
    this._retryButton.addEventListener('mouseleave', () => {
      this._retryButton.style.transform = 'scale(1)';
      this._retryButton.style.boxShadow = '0 4px 15px rgba(0, 210, 255, 0.3)';
    });

    this._retryButton.addEventListener('click', () => {
      if (this._retryCallback) {
        this._retryCallback();
      }
    });

    this._container.appendChild(this._retryButton);

    document.body.appendChild(this._container);
  }

  /**
   * Показать экран соединения
   */
  public show(reason: string = 'Соединение прервано'): void {
    this._isVisible = true;
    this._statusText.textContent = reason + ' Попытка переподключения...';
    this._container.style.display = 'flex';
    
    // Прячем кнопку при первой попытке
    this._retryButton.style.display = 'none';
    
    // Показываем анимацию
    this._statusIcon.style.borderColor = '#ff4444';
    this._statusIcon.style.borderTopColor = 'transparent';
  }

  /**
   * Показать ошибку с кнопкой повторной попытки
   */
  public showError(reason: string = 'Ошибка соединения'): void {
    this._isVisible = true;
    this._statusText.textContent = reason;
    this._container.style.display = 'flex';
    
    // Показываем кнопку
    this._retryButton.style.display = 'block';
    
    // Меняем иконку на крестик
    this._statusIcon.style.borderColor = '#ff4444';
    this._statusIcon.style.animation = 'none';
    this._statusIcon.style.borderTopColor = '#ff4444';
  }

  /**
   * Скрыть экран соединения
   */
  public hide(): void {
    this._isVisible = false;
    this._container.style.display = 'none';
  }

  /**
   * Обновить статус
   */
  public setStatus(status: string): void {
    this._statusText.textContent = status;
  }

  /**
   * Установить колбэк для кнопки повторной попытки
   */
  public setRetryCallback(callback: () => void): void {
    this._retryCallback = callback;
  }

  /**
   * Проверить, виден ли экран
   */
  public get isVisible(): boolean {
    return this._isVisible;
  }
}