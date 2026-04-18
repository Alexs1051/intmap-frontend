import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { RouteApi, RouteApiError } from "@core/api/route-api";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { BuildingOption, IRouteState, PathResult } from "@shared/types";
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
  private currentBuilding: BuildingOption | null = null;
  private readonly routeApi: RouteApi = new RouteApi();

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

  public setCurrentBuilding(building: BuildingOption | null): void {
    this.currentBuilding = building;
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

    const result = await this.findRoute(fromMarkerId, toMarkerId);
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
      void this.calculateAndShowRoute();
    } else {
      this.clearRoute();
    }
  }

  private async findRoute(fromMarkerId: string, toMarkerId: string): Promise<PathResult | null> {
    const backendId = this.currentBuilding?.backendId;

    if (backendId && this.markerManager) {
      try {
        const backendRoute = await this.routeApi.findRoute(backendId, fromMarkerId, toMarkerId);
        const path = backendRoute.markerIds
          .map((markerId, index) => {
            const marker = this.markerManager?.getMarker(markerId);
            if (!marker) {
              return null;
            }

            return {
              markerId,
              position: marker.position,
              name: marker.name,
              type: marker.type,
              distance: index === 0 ? 0 : (backendRoute.steps[index - 1]?.distance ?? backendRoute.steps[index - 1]?.weight ?? 0),
              distanceFromStart: index === 0
                ? 0
                : backendRoute.steps
                  .slice(0, index)
                  .reduce((sum, step) => sum + (step.distance ?? step.weight ?? 0), 0)
            };
          })
          .filter((node): node is NonNullable<typeof node> => node !== null);

        if (path.length > 0) {
          return {
            found: true,
            path,
            totalDistance: backendRoute.totalDistance,
            isPartial: backendRoute.isPartial,
            usedAlternateRoute: backendRoute.usedAlternateRoute,
            blockedGatewayId: backendRoute.blockedGatewayId ?? undefined,
            blockedGatewayName: backendRoute.blockedGatewayName ?? undefined,
            message: backendRoute.message ?? undefined
          };
        }
      } catch (error) {
        if (error instanceof RouteApiError) {
          this.logger.warn('Backend rejected route request for backend-driven building', error);
          return null;
        }

        this.logger.warn('Failed to load route from backend for backend-driven building', error);
        return null;
      }
    }

    return this.markerManager?.findPath(fromMarkerId, toMarkerId) ?? null;
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
      message: result.message || `Маршрут: ${distance}м, ${pathIds.length} точек`,
      type: result.isPartial ? 'warning' : 'info',
      duration: result.isPartial ? 7000 : 5000
    });

    // Фокусируем камеру на маршруте
    if (this.cameraManager && result.path.length > 0) {
      const positions = result.path.map((node: any) => node.position);
      this.cameraManager.focusOnRoute(positions, 1.5);
    }
  }
}
