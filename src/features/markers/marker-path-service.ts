import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { Logger } from "@core/logger/logger";
import { MarkerType, PathResult } from "@shared/types";
import { Marker } from "./marker";
import { MarkerGraphRenderer } from "./graph/marker-graph-renderer";
import { Pathfinder } from "./pathfinder";
import { IBuildingManager } from "@shared/interfaces";

export interface MarkerPathContext {
  logger: Logger;
  eventBus: EventBus;
  pathfinder: Pathfinder;
  graphRenderer: MarkerGraphRenderer;
  markers: Map<string, Marker>;
  highlightedPath: string[] | null;
  setHighlightedPathRef(path: string[] | null): void;
  hoveredMarker: Marker | null;
  graphVisible: boolean;
  buildingManager: IBuildingManager | null;
  setGraphVisibleRef(visible: boolean): void;
  updateMarkersVisibility(): void;
  isGatewayBlocked(markerId: string): boolean;
}

export class MarkerPathService {
  public findPath(context: MarkerPathContext, fromId: string, toId: string): PathResult | null {
    context.logger.debug(`Finding path from ${fromId} to ${toId}`);

    const destinationMarker = context.markers.get(toId);
    const destinationIsGateway = destinationMarker?.type === MarkerType.GATEWAY;
    const blockedGatewayIds = new Set(
      Array.from(context.markers.values())
        .filter(marker => marker.type === MarkerType.GATEWAY && context.isGatewayBlocked(marker.id) && marker.id !== toId)
        .map(marker => marker.id)
    );

    const preferredResult = blockedGatewayIds.size > 0
      ? context.pathfinder.findShortestPathAvoiding(fromId, toId, blockedGatewayIds)
      : null;

    const result = preferredResult ?? context.pathfinder.findShortestPath(fromId, toId);

    if (!result || !result.path || result.path.length === 0) {
      context.logger.warn(`Path not found from ${fromId} to ${toId}`);
      return null;
    }

    if (destinationIsGateway) {
      context.logger.debug(`Destination is gateway, returning direct path: ${result.path.map(p => p.markerId).join(' -> ')}`);
      return result;
    }

    const firstBlockedGateway = result.path.find((node, index) =>
      index > 0 && node.markerId !== toId && context.isGatewayBlocked(node.markerId)
    );

    if (firstBlockedGateway) {
      const alternateResult = context.pathfinder.findShortestPathAvoiding(fromId, toId, blockedGatewayIds);
      if (alternateResult?.path?.length) {
        context.logger.debug(`Alternate path found: ${alternateResult.path.map(p => p.markerId).join(' -> ')}`);
        return {
          ...alternateResult,
          usedAlternateRoute: true,
          message: 'Основной проход закрыт. Построен обходной маршрут.'
        };
      }

      const blockedIndex = result.path.findIndex(node => node.markerId === firstBlockedGateway.markerId);
      const partialPath = result.path.slice(0, blockedIndex + 1);
      const partialDistance = partialPath[partialPath.length - 1]?.distanceFromStart ?? result.totalDistance;

      return {
        found: true,
        path: partialPath,
        totalDistance: partialDistance,
        isPartial: true,
        blockedGatewayId: firstBlockedGateway.markerId,
        blockedGatewayName: firstBlockedGateway.name,
        message: `Без доступа к "${firstBlockedGateway.name}" добраться до выбранной метки нельзя.`
      };
    }

    context.logger.debug(`Path found: ${result.path.map(p => p.markerId).join(' -> ')}`);
    return result;
  }

  public highlightPath(context: MarkerPathContext, pathIds: string[]): void {
    this.clearPathHighlight(context);
    context.setHighlightedPathRef(pathIds);

    if (pathIds.length >= 2) {
      context.graphRenderer.highlightPath(pathIds);
      context.eventBus.emit(EventType.PATH_HIGHLIGHTED, { path: pathIds });
    }
  }

  public clearPathHighlight(context: MarkerPathContext): void {
    context.setHighlightedPathRef(null);

    if (context.hoveredMarker && context.graphVisible) {
      context.graphRenderer.highlightMarker(context.hoveredMarker.id);
    } else {
      context.graphRenderer.resetHighlight();
    }
    context.graphRenderer.clearRoute();
  }

  public setWaypointsVisible(context: MarkerPathContext, visible: boolean): void {
    context.markers.forEach(marker => {
      if (marker.type === MarkerType.WAYPOINT) {
        marker.setVisible(visible);
      }
    });
    context.logger.info(`Waypoints ${visible ? 'shown' : 'hidden'}`);
  }

  public rebuildGraph(context: MarkerPathContext): void {
    try {
      if (context.buildingManager && context.buildingManager.floorManager && context.buildingManager.floorManager.isFloorAnimating?.()) {
        context.logger.debug('Ignoring graph rebuild - floor animation in progress');
        return;
      }
    } catch { }

    context.logger.debug('Rebuilding graph with current marker positions');
    context.graphRenderer.hide();
    context.graphRenderer.clear();
    context.graphRenderer.renderAll();
    context.graphRenderer.show();
    context.setGraphVisibleRef(true);
    context.updateMarkersVisibility();

    context.logger.info('Graph rebuilt');
  }
}
