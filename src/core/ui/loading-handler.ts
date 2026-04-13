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
    this.eventBus.on(EventType.LOADING_PROGRESS, (data: any) => {
      const progress = data.data?.overall || data.overall || 0;
      const component = data.data?.component || data.component || 'ресурсов';
      this.updateProgress(progress, `Загрузка: ${component}...`);
    });

    this.eventBus.on(EventType.LOADING_START, () => {
      this.updateProgress(0, 'Начало загрузки...');
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
  private updateProgress(progress: number, status: string): void {
    const percent = Math.floor(progress * 100);
    const bar = document.getElementById('loading-bar');
    const percentEl = document.getElementById('loading-percent');
    const statusEl = document.getElementById('loading-status');

    if (bar) bar.style.width = `${percent}%`;
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (statusEl) statusEl.textContent = status;

    if (this.config.isDebug() && (percent === 0 || percent === 50 || percent === 100)) {
      this.logger.debug(`Loading progress: ${percent}%`);
    }
  }

  /**
   * Скрыть экран загрузки
   */
  private hide(): void {
    const loadingEl = document.getElementById('app-loading');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
      setTimeout(() => {
        loadingEl.style.display = 'none';
      }, 500);
    }
  }
}
