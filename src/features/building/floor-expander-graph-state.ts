import { Logger } from "@core/logger/logger";
import { IMarkerManager } from "@shared/interfaces";
import { PathNode } from "@shared/types";

interface SavedGraphState {
    graphWasVisible: boolean;
    fromMarkerId: string | null;
    toMarkerId: string | null;
    highlightedPath: string[] | null;
}

/**
 * Сохраняет и восстанавливает состояние графа/маршрута вокруг анимации этажей.
 */
export class FloorExpanderGraphState {
    private readonly logger: Logger;
    private readonly markerManager: IMarkerManager;
    private readonly savedState: SavedGraphState = {
        graphWasVisible: false,
        fromMarkerId: null,
        toMarkerId: null,
        highlightedPath: null
    };

    constructor(logger: Logger, markerManager: IMarkerManager) {
        this.logger = logger;
        this.markerManager = markerManager;
    }

    public saveAndHide(): void {
        this.savedState.graphWasVisible = this.markerManager.graphVisible;
        this.savedState.fromMarkerId = this.markerManager.getFromMarker();
        this.savedState.toMarkerId = this.markerManager.getToMarker();

        try {
            const selectedMarkers = this.markerManager.getSelectedMarkersForPath?.();
            this.savedState.highlightedPath = selectedMarkers && selectedMarkers.length > 0
                ? selectedMarkers
                : null;
        } catch {
            this.savedState.highlightedPath = null;
        }

        if (this.savedState.graphWasVisible) {
            this.markerManager.setGraphVisible(false);
        }

        this.markerManager.clearRouteSelection();
        this.markerManager.clearPathHighlight();
        this.logger.debug('Graph state saved and hidden');
    }

    public restore(): void {
        if (this.savedState.graphWasVisible) {
            this.logger.debug('Restoring graph with new positions');
            setTimeout(() => {
                this.markerManager.rebuildGraph();
                this.logger.debug('Graph rebuilt with current positions');
            }, 1000);
            this.logger.debug('Graph restore scheduled (1000ms delay)');
        }

        if (this.savedState.fromMarkerId && this.savedState.toMarkerId) {
            setTimeout(() => {
                this.markerManager.setFromMarker(this.savedState.fromMarkerId!);
                this.markerManager.setToMarker(this.savedState.toMarkerId!);

                try {
                    const pathResult = this.markerManager.findPath(this.savedState.fromMarkerId!, this.savedState.toMarkerId!);
                    if (pathResult?.path) {
                        const pathIds = pathResult.path.map((node: PathNode) => node.markerId);
                        this.markerManager.highlightPath(pathIds);
                        this.logger.debug(`Route recalculated and highlighted: ${pathIds.length} nodes`);
                    }
                } catch (error) {
                    this.logger.warn('Failed to recalculate route after expand', error);
                }

                this.logger.debug(`Route restored: ${this.savedState.fromMarkerId} -> ${this.savedState.toMarkerId}`);
            }, 1100);
            this.logger.debug('Route restore scheduled (1100ms delay)');
        }

        this.logger.debug('Graph state restored');
    }
}
