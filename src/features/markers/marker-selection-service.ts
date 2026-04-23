import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { Logger } from "@core/logger/logger";
import { FocusOptions } from "@shared/types";
import { Marker } from "./marker";

export interface MarkerSelectionContext {
  logger: Logger;
  eventBus: EventBus;
  markers: Map<string, Marker>;
  selectedMarker: Marker | null;
  setSelectedMarkerRef(marker: Marker | null): void;
  selectedForPathMarkers: Set<string>;
  fromMarkerId: string | null;
  toMarkerId: string | null;
  setFromMarkerId(markerId: string | null): void;
  setToMarkerId(markerId: string | null): void;
  onMarkerSelectedCallback: ((marker: Marker | null) => void) | null;
  updateMarkersVisibility(): void;
  focusOnMarker(markerId: string, options?: FocusOptions): Promise<void>;
}

export class MarkerSelectionService {
  public setFromMarker(context: MarkerSelectionContext, markerId: string): void {
    if (context.fromMarkerId) {
      const oldMarker = context.markers.get(context.fromMarkerId);
      if (oldMarker) {
        oldMarker.setAsFromMarker(false);
        context.selectedForPathMarkers.delete(context.fromMarkerId);
      }
    }

    context.setFromMarkerId(markerId);

    if (markerId) {
      const marker = context.markers.get(markerId);
      if (marker) {
        marker.setAsFromMarker(true);
        context.selectedForPathMarkers.add(markerId);
        marker.setVisible(true);
      }
    }

    context.updateMarkersVisibility();
    context.logger.debug(`From marker set to: ${markerId || 'none'}`);
  }

  public setToMarker(context: MarkerSelectionContext, markerId: string): void {
    if (context.toMarkerId) {
      const oldMarker = context.markers.get(context.toMarkerId);
      if (oldMarker) {
        oldMarker.setAsToMarker(false);
        context.selectedForPathMarkers.delete(context.toMarkerId);
      }
    }

    context.setToMarkerId(markerId);

    if (markerId) {
      const marker = context.markers.get(markerId);
      if (marker) {
        marker.setAsToMarker(true);
        context.selectedForPathMarkers.add(markerId);
        marker.setVisible(true);
      }
    }

    context.updateMarkersVisibility();
    context.logger.debug(`To marker set to: ${markerId || 'none'}`);
  }

  public clearRouteSelection(context: MarkerSelectionContext): void {
    this.setFromMarker(context, '');
    this.setToMarker(context, '');
    context.logger.debug('Route selection cleared');
  }

  public selectMarkerForPath(context: MarkerSelectionContext, markerId: string): void {
    if (!context.selectedForPathMarkers.has(markerId)) {
      context.selectedForPathMarkers.add(markerId);
      const marker = context.markers.get(markerId);
      if (marker) {
        marker.setVisible(true);
      }
      context.logger.debug(`Marker ${markerId} selected for path`);
    }
  }

  public clearSelectedPathMarkers(context: MarkerSelectionContext): void {
    context.selectedForPathMarkers.clear();
    context.updateMarkersVisibility();
    context.logger.debug('All path selected markers cleared');
  }

  public deselectMarkerFromPath(context: MarkerSelectionContext, markerId: string): void {
    context.selectedForPathMarkers.delete(markerId);
    context.updateMarkersVisibility();
    context.logger.debug(`Marker ${markerId} deselected from path`);
  }

  public clearSelectedMarkers(context: MarkerSelectionContext): void {
    context.selectedForPathMarkers.clear();
    context.setFromMarkerId(null);
    context.setToMarkerId(null);
  }

  public isMarkerSelectedForPath(context: MarkerSelectionContext, markerId: string): boolean {
    return context.selectedForPathMarkers.has(markerId);
  }

  public getSelectedMarkersForPath(context: MarkerSelectionContext): string[] {
    return Array.from(context.selectedForPathMarkers);
  }

  public handleMarkerClick(context: MarkerSelectionContext, marker: Marker): void {
    if (context.selectedMarker === marker) return;

    if (context.selectedMarker) {
      context.selectedMarker.setSelected(false);
    }

    marker.setSelected(true);
    context.setSelectedMarkerRef(marker);
    context.onMarkerSelectedCallback?.(marker);
    context.updateMarkersVisibility();

    context.logger.debug(`Marker clicked: ${marker.id} (${marker.name})`);
    context.eventBus.emit(EventType.MARKER_SELECTED, { marker: marker.id });
  }

  public handleMarkerDoubleClick(context: MarkerSelectionContext, marker: Marker): void {
    if (context.selectedMarker && context.selectedMarker !== marker) {
      context.selectedMarker.setSelected(false);
    }

    marker.setSelected(true);
    context.setSelectedMarkerRef(marker);

    void context.focusOnMarker(marker.id, { distance: 8, duration: 1.2 });
    context.logger.debug(`Marker double-clicked: ${marker.id} (${marker.name})`);
    context.eventBus.emit(EventType.MARKER_DOUBLE_CLICKED, { marker: marker.id });
  }

  public clearSelection(context: MarkerSelectionContext, onAfterClear?: () => void): void {
    if (!context.selectedMarker) {
      return;
    }

    context.selectedMarker.setSelected(false);
    context.setSelectedMarkerRef(null);
    context.onMarkerSelectedCallback?.(null);
    context.updateMarkersVisibility();
    onAfterClear?.();
  }

  public setSelectedMarker(context: MarkerSelectionContext, marker: Marker | null): void {
    if (context.selectedMarker === marker) return;

    if (context.selectedMarker) {
      context.selectedMarker.setSelected(false);
    }

    context.setSelectedMarkerRef(marker);

    if (marker) {
      marker.setSelected(true);
      marker.setVisible(true);
    }

    context.updateMarkersVisibility();
    context.onMarkerSelectedCallback?.(marker);
  }
}
