import { injectable } from "inversify";
import { Logger } from "../../core/logger/Logger";
import { UI } from "../../shared/constants";
import { IConnectionScreen } from "@shared/interfaces";

/**
 * Экран потери соединения
 */
@injectable()
export class ConnectionScreen implements IConnectionScreen {
  private logger: Logger;
  private config: typeof UI.CONNECTION;
  
  private container!: HTMLDivElement;
  private statusIcon!: HTMLDivElement;
  private statusText!: HTMLParagraphElement;
  private retryButton!: HTMLButtonElement;
  private _isVisible: boolean = false;
  private retryCallback: (() => void) | null = null;

  constructor(
    logger: Logger  ) {
    this.logger = logger.getLogger('ConnectionScreen');
    this.config = UI.CONNECTION;
    
    this.createConnectionScreen();
    this.logger.debug("ConnectionScreen created");
  }

  public update(): void {
    // UI компонент не требует обновления
  }

  private createConnectionScreen(): void {
    this.container = document.createElement('div');
    this.container.className = 'connection-screen';

    this.statusIcon = document.createElement('div');
    this.statusIcon.className = 'connection-icon';

    this.statusText = document.createElement('p');
    this.statusText.className = 'connection-text';

    this.retryButton = document.createElement('button');
    this.retryButton.className = 'connection-retry';
    this.retryButton.textContent = this.config.RETRY_BUTTON_TEXT;
    
    this.retryButton.addEventListener('mouseenter', () => {
      this.retryButton.style.transform = 'scale(1.05)';
      this.retryButton.style.boxShadow = '0 6px 20px rgba(0, 210, 255, 0.4)';
    });
    
    this.retryButton.addEventListener('mouseleave', () => {
      this.retryButton.style.transform = 'scale(1)';
      this.retryButton.style.boxShadow = '0 4px 15px rgba(0, 210, 255, 0.3)';
    });

    this.retryButton.addEventListener('click', () => this.retryCallback?.());

    this.container.appendChild(this.statusIcon);
    this.container.appendChild(this.statusText);
    this.container.appendChild(this.retryButton);
    document.body.appendChild(this.container);
  }

  public show(reason: string = this.config.DEFAULT_MESSAGE): void {
    this._isVisible = true;
    this.statusText.textContent = reason;
    this.container.style.display = 'flex';
    this.retryButton.style.display = 'none';
    this.statusIcon.classList.remove('error');
  }

  public showError(reason: string = this.config.ERROR_MESSAGE): void {
    this._isVisible = true;
    this.statusText.textContent = reason;
    this.container.style.display = 'flex';
    this.retryButton.style.display = 'block';
    this.statusIcon.classList.add('error');
  }

  public hide(): void {
    this._isVisible = false;
    this.container.style.display = 'none';
  }

  public setRetryCallback(callback: () => void): void {
    this.retryCallback = callback;
  }

  public dispose(): void {
    this.retryCallback = null;
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.logger.info("ConnectionScreen disposed");
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }
}