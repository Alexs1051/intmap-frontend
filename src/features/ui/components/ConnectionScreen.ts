import '../../../styles/components/connection-screen.css';

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
    this._container.className = 'connection-screen';

    this._statusIcon = document.createElement('div');
    this._statusIcon.className = 'connection-icon';

    this._statusText = document.createElement('p');
    this._statusText.className = 'connection-text';

    this._retryButton = document.createElement('button');
    this._retryButton.className = 'connection-retry';
    this._retryButton.textContent = 'Повторить попытку';
    
    this._retryButton.addEventListener('mouseenter', () => {
      this._retryButton.style.transform = 'scale(1.05)';
      this._retryButton.style.boxShadow = '0 6px 20px rgba(0, 210, 255, 0.4)';
    });
    
    this._retryButton.addEventListener('mouseleave', () => {
      this._retryButton.style.transform = 'scale(1)';
      this._retryButton.style.boxShadow = '0 4px 15px rgba(0, 210, 255, 0.3)';
    });

    this._retryButton.addEventListener('click', () => this._retryCallback?.());

    this._container.appendChild(this._statusIcon);
    this._container.appendChild(this._statusText);
    this._container.appendChild(this._retryButton);
    document.body.appendChild(this._container);
  }

  public show(reason: string = 'Соединение прервано'): void {
    this._isVisible = true;
    this._statusText.textContent = reason + ' Попытка переподключения...';
    this._container.style.display = 'flex';
    this._retryButton.style.display = 'none';
    this._statusIcon.classList.remove('error');
  }

  public showError(reason: string = 'Ошибка соединения'): void {
    this._isVisible = true;
    this._statusText.textContent = reason;
    this._container.style.display = 'flex';
    this._retryButton.style.display = 'block';
    this._statusIcon.classList.add('error');
  }

  public hide(): void {
    this._isVisible = false;
    this._container.style.display = 'none';
  }

  public setRetryCallback(callback: () => void): void {
    this._retryCallback = callback;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public dispose(): void {
    this._retryCallback = null;
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}