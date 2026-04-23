import { Ray, Scene } from "@babylonjs/core";
import { Logger } from "@core/logger/logger";
import { Marker } from "./marker";
import { MarkerGraphRenderer } from "./graph/marker-graph-renderer";

export interface MarkerInteractionContext {
  logger: Logger;
  scene?: Scene;
  graphRenderer: MarkerGraphRenderer;
  activeCamera: any;
  graphVisible: boolean;
  highlightedPath: string[] | null;
  hoveredMarker: Marker | null;
  setHoveredMarkerRef(marker: Marker | null): void;
  markers: Map<string, Marker>;
  lastClickTime: number;
  setLastClickTime(value: number): void;
  doubleClickThreshold: number;
  clearSelection(): void;
}

export class MarkerInteractionService {
  private raycasterActive: boolean = false;

  public setupHoverDetection(context: MarkerInteractionContext): void {
    if (!context.scene) return;

    const canvas = context.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    canvas.addEventListener('mousemove', (event) => {
      if (this.raycasterActive) return;
      this.raycasterActive = true;

      requestAnimationFrame(() => {
        this.checkHover(context, event);
        this.raycasterActive = false;
      });
    });
  }

  public checkHover(context: MarkerInteractionContext, event: MouseEvent): void {
    if (!context.scene) return;

    const canvas = context.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / canvas.width * canvas.width;
    const y = (event.clientY - rect.top) / canvas.height * canvas.height;

    const ray = context.scene.createPickingRay(x, y, null, context.activeCamera || null);
    const pickResult = context.scene.pickWithRay(ray, (mesh) => mesh.metadata?.widget !== undefined);

    let hoveredMarker: Marker | null = null;

    if (pickResult?.hit) {
      const potentialMarker = this.findMarkerByMesh(context.markers, pickResult.pickedMesh);
      if (potentialMarker && potentialMarker.isVisible) {
        hoveredMarker = potentialMarker;
      }
    }

    if (context.hoveredMarker !== hoveredMarker) {
      if (context.hoveredMarker) {
        context.hoveredMarker.setHovered(false);
        if (!context.highlightedPath) {
          context.graphRenderer.resetHighlight();
        }
      }

      context.setHoveredMarkerRef(hoveredMarker);

      if (hoveredMarker) {
        hoveredMarker.setHovered(true);
        if (context.graphVisible && !context.highlightedPath) {
          context.graphRenderer.highlightMarker(hoveredMarker.id);
        }
      }
    }
  }

  public handleScenePick(context: MarkerInteractionContext, ray: Ray): boolean {
    if (!context.scene) return false;

    const pickResult = context.scene.pickWithRay(ray, (mesh) => mesh.metadata?.widget !== undefined);

    if (pickResult?.hit) {
      const hitMarker = this.findMarkerByMesh(context.markers, pickResult.pickedMesh);

      if (hitMarker) {
        if (!hitMarker.isVisible) {
          context.logger.debug(`Marker ${hitMarker.id} is hidden, ignoring click`);
          return false;
        }

        const now = Date.now();
        const timeSinceLast = now - context.lastClickTime;

        if (timeSinceLast < context.doubleClickThreshold) {
          hitMarker.handleDoubleClick();
          context.setLastClickTime(0);
        } else {
          hitMarker.handleClick();
          context.setLastClickTime(now);
        }
        return true;
      }
    }

    context.clearSelection();
    return false;
  }

  private findMarkerByMesh(markers: Map<string, Marker>, mesh: any): Marker | null {
    if (!mesh?.metadata?.widget) return null;

    for (const marker of markers.values()) {
      if (marker.mesh === mesh) return marker;
    }

    return null;
  }
}
