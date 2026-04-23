import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { Logger } from "@core/logger/logger";
import { Marker } from "./marker";
import { MarkerGraphRenderer } from "./graph/marker-graph-renderer";
import { MarkerType, UserInfo } from "@shared/types";
import { IBuildingManager } from "@shared/interfaces";
import { MarkerUtils } from "@features/building/marker-utils";

export interface MarkerVisibilityContext {
  logger: Logger;
  eventBus: EventBus;
  markers: Map<string, Marker>;
  graphRenderer: MarkerGraphRenderer;
  buildingManager: IBuildingManager | null;
  userInfo: UserInfo;
  currentFloor: number | 'all';
  graphVisible: boolean;
  selectedMarker: Marker | null;
  selectedForPathMarkers: Set<string>;
  markersMuted: boolean;
}

export class MarkerVisibilityService {
  public updateMarkersVisibility(context: MarkerVisibilityContext): void {
    context.logger.debug('updateMarkersVisibility called', {
      graphVisible: context.graphVisible,
      currentFloor: context.currentFloor,
      totalMarkers: context.markers.size,
      selectedMarker: context.selectedMarker?.id
    });

    context.markers.forEach(marker => {
      const hasFloorAccess = context.buildingManager?.hasAccessToFloor?.(marker.floor) ?? true;
      const hasRoomAccess = context.buildingManager?.hasAccessToRoom?.(marker.data.roomId) ?? true;
      if (!hasFloorAccess || !hasRoomAccess) {
        marker.setVisible(false);
        return;
      }

      if (context.selectedForPathMarkers.has(marker.id)) {
        marker.setVisible(true);
        return;
      }

      if (context.selectedMarker === marker) {
        marker.setVisible(true);
        return;
      }

      if (context.markersMuted) {
        marker.setVisible(false);
        return;
      }

      const isAllFloorsMode = context.currentFloor === 'all';
      if (isAllFloorsMode) {
        marker.setVisible(marker.type === MarkerType.WAYPOINT ? context.graphVisible : true);
        return;
      }

      const isCorrectFloor = marker.floor === context.currentFloor;
      if (marker.type === MarkerType.WAYPOINT) {
        marker.setVisible(isCorrectFloor && context.graphVisible);
      } else {
        marker.setVisible(isCorrectFloor);
      }
    });

    if (context.graphVisible) {
      context.graphRenderer.updateVisibility();
    }
  }

  public hasAccessToMarker(context: MarkerVisibilityContext, markerId: string): boolean {
    const marker = context.markers.get(markerId);
    if (!marker || marker.type !== MarkerType.GATEWAY) {
      return true;
    }

    const parsedMarker = context.buildingManager?.getMarkerById?.(markerId);
    return MarkerUtils.hasRequiredRole(
      context.userInfo.role,
      marker.data.requiredRole ?? parsedMarker?.metadata?.requiredRole
    );
  }

  public setGraphVisible(context: MarkerVisibilityContext, visible: boolean): void {
    if (visible) {
      context.graphRenderer.show();
    } else {
      context.graphRenderer.hide();
    }

    this.updateMarkersVisibility({ ...context, graphVisible: visible });
    context.eventBus.emit(EventType.GRAPH_VISIBILITY_CHANGED, { visible });
  }
}
