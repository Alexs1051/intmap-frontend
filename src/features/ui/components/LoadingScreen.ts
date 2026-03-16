export class LoadingScreen {
  private _container: HTMLDivElement;
  private _progressBar: HTMLDivElement;
  private _progressText: HTMLSpanElement;
  private _statusText: HTMLParagraphElement;
  private _isVisible: boolean = false;

  constructor() {
    console.log("📦 Создаём LoadingScreen");
    this.createLoadingScreen();
  }

  private createLoadingScreen(): void {
    // Основной контейнер
    this._container = document.createElement('div');
    this._container.id = 'loading-screen';
    this._container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      font-family: 'Arial', sans-serif;
      transition: opacity 0.5s ease;
    `;

    // Логотип или заголовок
    const title = document.createElement('h1');
    title.textContent = '3D Map';
    title.style.cssText = `
      color: white;
      font-size: 48px;
      margin-bottom: 30px;
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
      letter-spacing: 2px;
    `;
    this._container.appendChild(title);

    // Контейнер для прогресс-бара
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      width: 300px;
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 15px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    // Прогресс-бар
    this._progressBar = document.createElement('div');
    this._progressBar.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
      transition: width 0.3s ease;
      border-radius: 10px;
    `;
    progressContainer.appendChild(this._progressBar);
    this._container.appendChild(progressContainer);

    // Текст прогресса (проценты)
    this._progressText = document.createElement('span');
    this._progressText.style.cssText = `
      color: white;
      font-size: 16px;
      margin-bottom: 10px;
      font-weight: bold;
    `;
    this._progressText.textContent = '0%';
    this._container.appendChild(this._progressText);

    // Статус загрузки
    this._statusText = document.createElement('p');
    this._statusText.style.cssText = `
      color: #aaa;
      font-size: 14px;
      text-align: center;
      max-width: 400px;
      line-height: 1.5;
    `;
    this._statusText.textContent = 'Инициализация...';
    this._container.appendChild(this._statusText);

    document.body.appendChild(this._container);
    console.log("✅ LoadingScreen создан и добавлен в DOM");
  }

  /**
   * Показать экран загрузки
   */
  public show(): void {
    console.log("👁️ Показываем LoadingScreen");
    this._isVisible = true;
    this._container.style.display = 'flex';
    this._container.style.opacity = '1';
  }

  /**
   * Скрыть экран загрузки
   */
  public hide(): void {
    console.log("👁️ Скрываем LoadingScreen");
    this._container.style.opacity = '0';
    setTimeout(() => {
      this._container.style.display = 'none';
      this._isVisible = false;
      console.log("✅ LoadingScreen скрыт");
    }, 500);
  }

  /**
   * Обновить прогресс загрузки
   */
  public updateProgress(progress: number): void {
    const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
    console.log(`📊 updateProgress: ${percent}%`);
    this._progressBar.style.width = `${percent}%`;
    this._progressText.textContent = `${percent}%`;
  }

  /**
   * Установить статус загрузки
   */
  public setStatus(status: string): void {
    console.log(`📝 setStatus: ${status}`);
    this._statusText.textContent = status;
  }

  /**
   * Очистить ресурсы и удалить DOM элементы
   */
  public dispose(): void {
    console.log("🗑️ LoadingScreen disposed");
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }

  /**
   * Проверить, виден ли экран загрузки
   */
  public get isVisible(): boolean {
    return this._isVisible;
  }
}