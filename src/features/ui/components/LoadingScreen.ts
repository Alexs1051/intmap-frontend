import '../../../styles/components/loading-screen.css';

export class LoadingScreen {
  private _container: HTMLDivElement;
  private _progressBar: HTMLDivElement;
  private _progressText: HTMLSpanElement;
  private _statusText: HTMLParagraphElement;
  private _isVisible: boolean = false;

  constructor() {
    this.createLoadingScreen();
  }

  private createLoadingScreen(): void {
    this._container = document.createElement('div');
    this._container.id = 'loading-screen';
    this._container.className = 'loading-screen';

    const title = document.createElement('h1');
    title.className = 'loading-title';
    title.textContent = '3D Map';

    const progressContainer = document.createElement('div');
    progressContainer.className = 'loading-progress-container';

    this._progressBar = document.createElement('div');
    this._progressBar.className = 'loading-progress-bar';

    this._progressText = document.createElement('span');
    this._progressText.className = 'loading-progress-text';
    this._progressText.textContent = '0%';

    this._statusText = document.createElement('p');
    this._statusText.className = 'loading-status';
    this._statusText.textContent = 'Инициализация...';

    progressContainer.appendChild(this._progressBar);
    this._container.appendChild(title);
    this._container.appendChild(progressContainer);
    this._container.appendChild(this._progressText);
    this._container.appendChild(this._statusText);
    document.body.appendChild(this._container);
  }

  public show(): void {
    this._isVisible = true;
    this._container.style.display = 'flex';
    this._container.style.opacity = '1';
  }

  public hide(): void {
    this._container.style.opacity = '0';
    setTimeout(() => {
      this._container.style.display = 'none';
      this._isVisible = false;
    }, 500);
  }

  public updateProgress(progress: number): void {
    const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
    this._progressBar.style.width = `${percent}%`;
    this._progressText.textContent = `${percent}%`;
  }

  public setStatus(status: string): void {
    this._statusText.textContent = status;
  }

  public dispose(): void {
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }
}