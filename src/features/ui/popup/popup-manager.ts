import { injectable } from "inversify";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { NotificationType, PopupOptions } from "@shared/types";
import { UI } from "@shared/constants";
import { IPopupManager } from "@shared/interfaces";

@injectable()
export class PopupManager implements IPopupManager {
  private logger: Logger;
  private eventBus: EventBus;

  private container!: HTMLDivElement;
  private activePopups: HTMLDivElement[] = [];
  private timeouts: Map<HTMLDivElement, ReturnType<typeof setTimeout>> = new Map();

  private defaultDuration: number = UI.NOTIFICATION.DEFAULT_DURATION;
  private maxPopups: number = UI.NOTIFICATION.MAX_POPUPS;
  private animationDuration: number = UI.NOTIFICATION.ANIMATION_DURATION;

  constructor(
    logger: Logger,
    eventBus: EventBus
  ) {
    this.logger = logger.getLogger('PopupManager');
    this.eventBus = eventBus;

    this.createContainer();
    this.logger.debug("PopupManager created");
  }

  public update(): void { }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'popup-container';
    this.container.className = 'popup-container';
    document.body.appendChild(this.container);
  }

  public show(options: PopupOptions): void {
    const { message, type = 'info', duration = this.defaultDuration, closable = true } = options;

    while (this.activePopups.length >= this.maxPopups) {
      const oldest = this.activePopups.shift();
      if (oldest) this.removePopup(oldest);
    }

    const popup = this.createPopup(message, type, closable, duration);

    this.container.appendChild(popup);
    this.activePopups.push(popup);

    requestAnimationFrame(() => {
      popup.classList.add('visible');
    });

    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.removePopup(popup);
      }, duration);
      this.timeouts.set(popup, timeout);
    }

    this.eventBus.emit(EventType.UI_NOTIFICATION, { message, type });
  }

  private createPopup(message: string, type: NotificationType, closable: boolean, duration: number): HTMLDivElement {
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
        this.removePopup(popup);
      });

      popup.appendChild(closeBtn);

      popup.addEventListener('click', (e) => {
        if (e.target === popup || (e.target as HTMLElement).classList.contains('popup-text')) {
          this.removePopup(popup);
        }
      });
    }

    return popup;
  }

  private removePopup(popup: HTMLDivElement): void {
    const timeout = this.timeouts.get(popup);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(popup);
    }

    popup.classList.remove('visible');

    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      const index = this.activePopups.indexOf(popup);
      if (index !== -1) {
        this.activePopups.splice(index, 1);
      }
    }, this.animationDuration);
  }

  private getIconForType(type: NotificationType): string {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };
    return icons[type];
  }

  public info(message: string, duration: number = this.defaultDuration): void {
    this.show({ message, type: 'info', duration });
  }

  public success(message: string, duration: number = this.defaultDuration): void {
    this.show({ message, type: 'success', duration });
  }

  public error(message: string, duration: number = this.defaultDuration): void {
    this.show({ message, type: 'error', duration });
  }

  public warning(message: string, duration: number = this.defaultDuration): void {
    this.show({ message, type: 'warning', duration });
  }

  public hideAll(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();

    [...this.activePopups].forEach(popup => this.removePopup(popup));
  }

  public setMaxPopups(max: number): void {
    this.maxPopups = max;
    while (this.activePopups.length > this.maxPopups) {
      const oldest = this.activePopups.shift();
      if (oldest) this.removePopup(oldest);
    }
  }

  public setDefaultDuration(duration: number): void {
    this.defaultDuration = duration;
  }

  public dispose(): void {
    this.hideAll();
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.logger.info("PopupManager disposed");
  }
}