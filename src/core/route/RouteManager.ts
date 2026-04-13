import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/Container";
import { Logger } from "@core/logger/Logger";
import { EventBus } from "@core/events/EventBus";
import { EventType } from "@core/events/EventTypes";
import { IRouteState } from "@shared/types";
import { IMarkerManager, ICameraManager } from "@shared/interfaces";

/**
 * Менеджер маршрутов
 * Отвечает за управление начальными и конечными точками маршрута
 */
@injectable()
export class RouteManager {
  private routeState: IRouteState = {
    fromMarkerId: null,
    toMarkerId: null,
    isActive: false
  };

  private logger: Logger;
  private eventBus: EventBus;
  private markerManager?: IMarkerManager;
  private cameraManager?: ICameraManager;

  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.EventBus) eventBus: EventBus
  ) {
    this.logger = logger.getLogger('RouteManager');
    this.eventBus = eventBus;
  }

  /**
   * Установить зависимости
   */
  public setDependencies(
    markerManager: IMarkerManager,
    cameraManager: ICameraManager
  ): void {
    this.markerManager = markerManager;
    this.cameraManager = cameraManager;
    this.logger.debug('Dependencies set');
  }

  /**
   * Установить начальный маркер
   */
  public setFromMarker(markerId: string): void {
    const previousFrom = this.routeState.fromMarkerId;

    if (previousFrom === markerId) {
      // Деактивируем
      this.markerManager?.setFromMarker('');
      this.routeState.fromMarkerId = null;
      this.routeState.isActive = false;
      this.logger.debug(`From marker deactivated: ${markerId}`);
    } else {
      // Активируем (автоматически деактивирует предыдущий)
      this.markerManager?.setFromMarker(markerId);
      this.routeState.fromMarkerId = markerId;
      this.routeState.isActive = true;
      this.logger.debug(`From marker set: ${markerId}`);
    }

    this.onRouteStateChanged();
  }

  /**
   * Установить конечный маркер
   */
  public setToMarker(markerId: string): void {
    const previousTo = this.routeState.toMarkerId;

    if (previousTo === markerId) {
      // Деактивируем
      this.markerManager?.setToMarker('');
      this.routeState.toMarkerId = null;
      this.routeState.isActive = false;
      this.logger.debug(`To marker deactivated: ${markerId}`);
    } else {
      // Активируем (автоматически деактивирует предыдущий)
      this.markerManager?.setToMarker(markerId);
      this.routeState.toMarkerId = markerId;
      this.routeState.isActive = true;
      this.logger.debug(`To marker set: ${markerId}`);
    }

    this.onRouteStateChanged();
  }

  /**
   * Проверить, является ли маркер начальным
   */
  public isFromMarker(markerId: string): boolean {
    return this.routeState.fromMarkerId === markerId;
  }

  /**
   * Проверить, является ли маркер конечным
   */
  public isToMarker(markerId: string): boolean {
    return this.routeState.toMarkerId === markerId;
  }

  /**
   * Получить текущее состояние маршрута
   */
  public getRouteState(): IRouteState {
    return this.routeState;
  }

  /**
   * Построить и показать маршрут
   */
  public async calculateAndShowRoute(): Promise<void> {
    const { fromMarkerId, toMarkerId } = this.routeState;

    this.logger.debug('calculateAndShowRoute called', { fromMarkerId, toMarkerId });

    if (!fromMarkerId || !toMarkerId || !this.markerManager) {
      this.logger.debug('Missing from/to or markerManager');
      return;
    }

    const result = this.markerManager.findPath(fromMarkerId, toMarkerId);
    this.logger.debug('Path result:', result);

    if (result && result.path && result.path.length > 0) {
      this.highlightRouteResult(result);
    } else {
      this.logger.debug('Path not found');
      this.clearRoute();
    }
  }

  /**
   * Очистить маршрут
   */
  public clearRoute(): void {
    this.markerManager?.clearPathHighlight();
    this.logger.debug('Route cleared');
  }

  /**
   * Сбросить маршрут
   */
  public resetRoute(): void {
    this.routeState = {
      fromMarkerId: null,
      toMarkerId: null,
      isActive: false
    };

    this.markerManager?.setFromMarker('');
    this.markerManager?.setToMarker('');
    this.clearRoute();

    this.logger.debug('Route reset');
  }

  /**
   * Активен ли сейчас маршрут
   */
  public isRouteActive(): boolean {
    return this.routeState.isActive;
  }

  /**
   * Обработка изменения состояния маршрута
   */
  private onRouteStateChanged(): void {
    const { fromMarkerId, toMarkerId } = this.routeState;

    // Если есть оба маркера - строим путь
    if (fromMarkerId && toMarkerId) {
      this.calculateAndShowRoute();
    } else {
      this.clearRoute();
    }
  }

  /**
   * Подсветить результат маршрута
   */
  private highlightRouteResult(result: any): void {
    // Извлекаем markerId из PathNode[]
    const pathIds: string[] = result.path.map((node: any) => node.markerId);
    this.logger.debug('Highlighting path:', pathIds);

    this.markerManager?.highlightPath(pathIds);

    const distance = result.totalDistance?.toFixed(1) || '?';
    this.eventBus.emit(EventType.UI_NOTIFICATION, {
      message: `Маршрут: ${distance}м, ${pathIds.length} точек`,
      type: 'info',
      duration: 5000
    });

    // Фокусируем камеру на маршруте
    if (this.cameraManager && result.path.length > 0) {
      const positions = result.path.map((node: any) => node.position);
      this.cameraManager.focusOnRoute(positions, 1.5);
    }
  }
}
