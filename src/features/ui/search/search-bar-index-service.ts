import { injectable } from "inversify";
import { IMarker, IMarkerManager } from "@shared/interfaces";
import { MarkerType, SearchResult } from "@shared/types";

@injectable()
export class SearchBarIndexService {
  public buildResults(markerManager: IMarkerManager): SearchResult[] {
    return markerManager
      .getAllMarkers()
      .filter((marker) => marker.type !== MarkerType.WAYPOINT)
      .map((marker) => this.toSearchResult(marker));
  }

  private toSearchResult(marker: IMarker): SearchResult {
    return {
      id: marker.id,
      name: marker.name || 'Без названия',
      type: marker.type,
      iconName: marker.iconName || this.getDefaultIconForType(marker.type),
      floor: marker.floor ?? 1,
      marker: marker.data,
      backgroundColor: marker.backgroundColor,
      textColor: marker.textColor
    };
  }

  private getDefaultIconForType(type: MarkerType): string {
    switch (type) {
      case MarkerType.MARKER:
        return '📍';
      case MarkerType.FLAG:
        return '🚩';
      case MarkerType.GATEWAY:
        return 'gateway-blocked';
      default:
        return '📍';
    }
  }
}
