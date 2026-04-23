import { Scene } from "@babylonjs/core";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { MarkerApi } from "@core/api/marker-api";
import { Logger } from "@core/logger/logger";
import { BuildingOption, AnyMarkerData, MarkerType, UserInfo } from "@shared/types";
import { Marker } from "./marker";
import { MarkerGraph } from "./graph/marker-graph";
import { MarkerGraphRenderer } from "./graph/marker-graph-renderer";
import { IBuildingManager, IWallManager } from "@shared/interfaces";
import { MarkerUtils } from "@features/building/marker-utils";

export interface MarkerLoadingContext {
  logger: Logger;
  eventBus: EventBus;
  markerApi: MarkerApi;
  scene?: Scene;
  wallManager?: IWallManager;
  markers: Map<string, Marker>;
  graph: MarkerGraph;
  graphRenderer: MarkerGraphRenderer;
  setGraphRendererMarkerManager(): void;
  buildingManager: IBuildingManager | null;
  currentBuilding: BuildingOption | null;
  userInfo: UserInfo;
  graphVisible: boolean;
  setGraphVisibleRef(visible: boolean): void;
  setCurrentFloorRef(floor: number | 'all'): void;
  setInitializedRef(value: boolean): void;
  setSelectedMarkerRef(marker: Marker | null): void;
  setHoveredMarkerRef(marker: Marker | null): void;
  setHighlightedPathRef(path: string[] | null): void;
  selectedForPathMarkers: Set<string>;
  updateMarkersVisibility(): void;
  getMarkersStats(): { total: number; connections: number };
  handleMarkerClick(marker: Marker): void;
  handleMarkerDoubleClick(marker: Marker): void;
  applyGatewayVisualState(marker: Marker): Promise<void>;
}

export class MarkerLoadingService {
  public async initialize(context: MarkerLoadingContext): Promise<void> {
    context.logger.info("Initializing MarkerManager");

    this.clearAllMarkers(context);

    const loadedFromBackend = await this.tryLoadMarkersFromBackend(context);
    if (!loadedFromBackend) {
      context.logger.error(`Backend marker loading failed for building ${context.currentBuilding?.buildingCode ?? context.currentBuilding?.id}; marker initialization aborted`);
    }

    this.rebuildGraphFromMarkerConnections(context);

    context.graphRenderer.renderAll();
    context.setGraphRendererMarkerManager();
    context.graphRenderer.hide();

    context.setGraphVisibleRef(false);
    const floorManager = context.buildingManager?.floorManager;
    const viewMode = floorManager?.getViewMode?.() ?? 'all';
    context.setCurrentFloorRef(viewMode === 'all' ? 'all' : (floorManager?.currentFloor ?? 1));
    context.updateMarkersVisibility();

    context.eventBus.on(EventType.FLOOR_CHANGED, (event) => {
      const floorData = event.data;
      if (floorData && typeof floorData.floor !== 'undefined') {
        context.setCurrentFloorRef(floorData.floor);
        context.updateMarkersVisibility();

        if (context.graphVisible) {
          context.graphRenderer.updateVisibility();
        }
      }
    });

    context.setInitializedRef(true);

    const stats = context.getMarkersStats();
    context.logger.info(`MarkerManager initialized: ${stats.total} markers, ${stats.connections} connections`);
    context.eventBus.emit(EventType.MARKERS_LOADED, stats);
  }

  public async tryLoadMarkersFromBackend(context: MarkerLoadingContext): Promise<boolean> {
    const backendId = context.currentBuilding?.backendId;
    const buildingCode = context.currentBuilding?.buildingCode ?? context.currentBuilding?.id;

    if (!backendId || !buildingCode) {
      return false;
    }

    try {
      const parsedMarkers = context.buildingManager?.getMarkers?.() as Map<string, any> | undefined;
      const parsedMarkersByExternalId = new Map<string, any>();
      parsedMarkers?.forEach((parsedMarker, key) => {
        parsedMarkersByExternalId.set(key, parsedMarker);
      });

      const markers = await context.markerApi.getMarkerGraph(
        backendId,
        buildingCode,
        context.userInfo.role ?? 'guest',
        parsedMarkersByExternalId
      );

      if (markers.length === 0) {
        context.logger.warn(`Backend returned no markers for building ${buildingCode}`);
        return false;
      }

      context.logger.info(`Loading ${markers.length} markers from backend`);
      markers.forEach((markerData) => this.createMarker(context, markerData));
      context.logger.info(`Successfully loaded ${context.markers.size} backend markers`);
      return true;
    } catch (error) {
      context.logger.warn('Failed to load markers from backend', error);
      return false;
    }
  }

  public rebuildGraphFromMarkerConnections(context: MarkerLoadingContext): void {
    context.markers.forEach(marker => {
      const connections = marker.data.connections;
      if (connections && connections.length > 0) {
        for (const conn of connections) {
          if (typeof conn === 'string') {
            context.graph.addConnection(marker.id, conn, 'two-way');
          } else if (typeof conn === 'object' && conn.toId) {
            context.graph.addConnection(conn.fromId || marker.id, conn.toId, conn.direction || 'two-way', conn.weight);
          }
        }
      }
    });
  }

  public createMarker(context: MarkerLoadingContext, data: AnyMarkerData): Marker {
    if (!context.scene) {
      throw new Error("Scene not set");
    }

    if (data.type === MarkerType.GATEWAY) {
      const parsedMarker = context.buildingManager?.getMarkerById?.(data.id);
      const requiredRole = data.requiredRole ?? parsedMarker?.metadata?.requiredRole;
      const hasAccess = data.hasAccess ?? MarkerUtils.hasRequiredRole(context.userInfo.role, requiredRole);

      data.hasAccess = hasAccess;
      data.isBlocked = !hasAccess;
      data.iconName = hasAccess ? 'gateway-allowed' : 'gateway-blocked';
      data.requiredRole = requiredRole;
      data.backgroundColor = { r: 0, g: 0, b: 0, a: 0 };
      data.textColor = hasAccess
        ? { r: 0.95, g: 0.8, b: 0.2, a: 1 }
        : { r: 0.95, g: 0.25, b: 0.2, a: 1 };
    }

    const marker = Marker.create(
      context.logger,
      context.eventBus,
      context.scene,
      data
    );

    if (data.type === MarkerType.GATEWAY) {
      void context.applyGatewayVisualState(marker);
    }

    marker.onClick = (m) => context.handleMarkerClick(m);
    marker.onDoubleClick = (m) => context.handleMarkerDoubleClick(m);

    if (context.wallManager) {
      context.wallManager.assignMarkerRenderingGroup(marker.mesh);
    }

    context.markers.set(data.id, marker);
    context.graph.addNode(marker);
    marker.setVisible(false);
    context.eventBus.emit(EventType.MARKER_ADDED, { marker: marker.id });
    return marker;
  }

  public clearAllMarkers(context: MarkerLoadingContext): void {
    context.markers.forEach(marker => marker.dispose());
    context.markers.clear();
    context.graph.clear();
    context.setSelectedMarkerRef(null);
    context.setHoveredMarkerRef(null);
    context.setHighlightedPathRef(null);
    context.selectedForPathMarkers.clear();
    context.graphRenderer.clear();
  }
}
