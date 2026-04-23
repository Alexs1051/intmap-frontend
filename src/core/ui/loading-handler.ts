import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { ConfigService } from "@core/config/config-service";
import { Logger } from "@core/logger/logger";
import { showCriticalError, hideCriticalError } from "@core/utils/ui-helpers";

/**
 * Обработчик загрузки приложения
 * Управляет UI состоянием во время загрузки
 */
export class LoadingHandler {
  private logger: Logger;
  private config: ConfigService;
  private loadingEl: HTMLElement | null = null;
  private barEl: HTMLElement | null = null;
  private percentEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;

  constructor(
    private eventBus: EventBus,
    config: ConfigService
  ) {
    this.config = config;
    this.logger = Logger.getInstance().getLogger('LoadingHandler');
  }

  /**
   * Настроить обработчики событий загрузки
   */
  public setup(): void {
    this.cacheElements();

    this.eventBus.on(EventType.LOADING_PROGRESS, (data: any) => {
      const progress = data.data?.overall || data.overall || 0;
      const component = data.data?.component || data.component || 'ресурсов';
      this.updateProgress(progress, `Загрузка: ${component}...`);
    });

    this.eventBus.on(EventType.LOADING_START, () => {
      this.show('Начало загрузки...', 0);
      hideCriticalError();
    });

    this.eventBus.on(EventType.LOADING_COMPLETE, () => {
      setTimeout(() => {
        this.hide();
      }, 500);
    });

    this.eventBus.on(EventType.LOADING_ERROR, (data: any) => {
      this.hide();
      const errorData = data.data || data;
      const errorMessage = errorData.error?.message || errorData.error || errorData.message || "Неизвестная ошибка";
      showCriticalError(`Ошибка загрузки: ${errorMessage}`, 0);
    });
  }

  /**
   * Обновить прогресс загрузки
   */
  public updateProgress(progress: number, status: string): void {
    this.show(status, progress);

    const percent = Math.floor(progress * 100);
    if (this.barEl) this.barEl.style.width = `${percent}%`;
    if (this.percentEl) this.percentEl.textContent = `${percent}%`;
    if (this.statusEl) this.statusEl.textContent = status;

    if (this.config.isDebug() && (percent === 0 || percent === 50 || percent === 100)) {
      this.logger.debug(`Loading progress: ${percent}%`);
    }
  }

  /**
   * Скрыть экран загрузки
   */
  public hide(): void {
    if (this.loadingEl) {
      this.loadingEl.classList.add('hidden');
      setTimeout(() => {
        if (this.loadingEl?.classList.contains('hidden')) {
          this.loadingEl.style.display = 'none';
        }
      }, 500);
    }
  }

  public show(status: string, progress: number = 0): void {
    this.cacheElements();
    this.syncTheme();

    if (this.loadingEl) {
      this.loadingEl.style.display = 'flex';
      this.loadingEl.classList.remove('hidden');
    }

    const percent = Math.floor(progress * 100);
    if (this.barEl) this.barEl.style.width = `${percent}%`;
    if (this.percentEl) this.percentEl.textContent = `${percent}%`;
    if (this.statusEl) this.statusEl.textContent = status;
  }

  private cacheElements(): void {
    this.loadingEl = document.getElementById('app-loading');
    this.barEl = document.getElementById('loading-bar');
    this.percentEl = document.getElementById('loading-percent');
    this.statusEl = document.getElementById('loading-status');
  }

  private syncTheme(): void {
    if (!this.loadingEl) {
      return;
    }

    this.loadingEl.classList.toggle('theme-light', document.documentElement.classList.contains('theme-light'));
  }
}
