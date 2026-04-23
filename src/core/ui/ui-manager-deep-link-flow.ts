import { Logger } from "@core/logger/logger";
import { getQueryParam } from "@shared/utils/url.utils";
import { Marker } from "@features/markers/marker";
import { IBuildingTitle, IMarker, IMarkerDetailsPanel, IMarkerManager, IPopupManager } from "@shared/interfaces";

export interface UIManagerDeepLinkFlowContext {
  buildingTitle?: IBuildingTitle;
  markerManager?: IMarkerManager;
  markerDetailsPanel?: IMarkerDetailsPanel;
  popupManager?: IPopupManager;
  handleBuildingChange(buildingId: string): Promise<void>;
}

export class UIManagerDeepLinkFlow {
  private pendingDeepLink: { buildingId: string; flagRef: string } | null = null;
  private isHandlingDeepLink: boolean = false;

  constructor(private readonly logger: Logger) {}

  public capturePendingDeepLink(): void {
    const buildingId = getQueryParam('b')?.trim();
    const flagRef = getQueryParam('f')?.trim();

    if (buildingId && flagRef) {
      this.pendingDeepLink = { buildingId, flagRef };
    }
  }

  public getPendingBuildingId(): string | undefined {
    return this.pendingDeepLink?.buildingId;
  }

  public async processPendingDeepLink(context: UIManagerDeepLinkFlowContext): Promise<void> {
    if (
      this.isHandlingDeepLink ||
      !this.pendingDeepLink ||
      !context.buildingTitle ||
      !context.markerManager
    ) {
      return;
    }

    const { buildingId, flagRef } = this.pendingDeepLink;
    this.isHandlingDeepLink = true;

    try {
      if (context.buildingTitle.selectedBuilding?.id !== buildingId) {
        const selected = context.buildingTitle.selectBuilding(buildingId, false);
        if (!selected) {
          this.logger.warn(`Deep-link building not found: ${buildingId}`);
          this.pendingDeepLink = null;
          return;
        }

        await context.handleBuildingChange(buildingId);
      }

      const marker = this.findMarkerByDeepLinkFlag(context.markerManager, flagRef);
      if (!marker) {
        this.logger.debug(`Deep-link marker not found yet: ${flagRef}`);
        return;
      }

      this.pendingDeepLink = null;
      context.markerManager.setSelectedMarker(marker);
      context.markerDetailsPanel?.show(marker as Marker);
      await context.markerManager.focusOnMarker(marker.id, { distance: 8, duration: 1.2 });
      context.popupManager?.info(`Открыта метка: ${marker.name}`, 3500);
    } finally {
      this.isHandlingDeepLink = false;
    }
  }

  private findMarkerByDeepLinkFlag(markerManager: IMarkerManager, flagRef: string): IMarker | undefined {
    return markerManager.getAllMarkers().find((marker) => this.matchesDeepLinkFlag(marker, flagRef));
  }

  private matchesDeepLinkFlag(marker: IMarker, flagRef: string): boolean {
    if (!marker.hasQR()) {
      return false;
    }

    if (marker.id === flagRef) {
      return true;
    }

    const qr = marker.getQR();
    if (!qr) {
      return false;
    }

    try {
      const parsedUrl = new URL(qr, window.location.origin);
      return parsedUrl.searchParams.get('f') === flagRef;
    } catch {
      return qr.includes(`f=${encodeURIComponent(flagRef)}`) || qr.endsWith(`/${flagRef}`);
    }
  }
}
