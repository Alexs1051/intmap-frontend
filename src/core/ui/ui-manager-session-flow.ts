import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession } from "@core/api/api-client";
import { EventBus } from "@core/events/event-bus";
import { EventType } from "@core/events/event-types";
import { Marker } from "@features/markers/marker";
import { AuthResult, MarkerType, UserInfo } from "@shared/types";
import { IBuildingManager, IControlPanel, IMarkerDetailsPanel, IMarkerManager, IPopupManager, ISearchBar } from "@shared/interfaces";
import { RouteManager } from "@core/route/route-manager";

export interface UIManagerSessionFlowContext {
  controlPanel?: IControlPanel;
  markerManager?: IMarkerManager;
  buildingManager?: IBuildingManager;
  searchBar?: ISearchBar;
  markerDetailsPanel?: IMarkerDetailsPanel;
  popupManager?: IPopupManager;
  routeManager: RouteManager;
  eventBus: EventBus;
  refreshSceneAccessState(): Promise<void>;
}

export class UIManagerSessionFlow {
  public restoreStoredAuthSession(): UserInfo {
    const session = getStoredAuthSession();
    if (!session) {
      return { isAuthenticated: false, role: 'guest' };
    }

    return {
      isAuthenticated: true,
      username: session.login,
      role: session.role,
      token: session.token
    };
  }

  public async handleAuthResult(
    result: AuthResult,
    context: UIManagerSessionFlowContext
  ): Promise<UserInfo> {
    const userInfo: UserInfo = result.success
      ? {
        isAuthenticated: true,
        username: result.username,
        role: (result.role as UserInfo['role']) ?? 'user',
        token: result.token
      }
      : {
        isAuthenticated: false,
        role: 'guest'
      };

    if (result.success && result.username && result.token) {
      setStoredAuthSession({
        token: result.token,
        login: result.username,
        role: userInfo.role ?? 'user'
      });
    } else if (!result.success) {
      clearStoredAuthSession();
    }

    context.controlPanel?.setAuthState(userInfo);
    context.markerManager?.setUserInfo(userInfo);
    context.buildingManager?.setUserInfo(userInfo);
    context.searchBar?.refreshMarkers();
    context.routeManager.resetRoute();
    await context.refreshSceneAccessState();

    const currentMarker = context.markerDetailsPanel?.currentMarker;
    if (currentMarker && currentMarker.type === MarkerType.GATEWAY) {
      context.markerDetailsPanel?.show(currentMarker as Marker);
    }

    if (result.success) {
      context.popupManager?.success(`Авторизация выполнена: ${result.username}`);
      context.eventBus.emit(EventType.UI_AUTH_SUCCESS, userInfo);
    } else {
      context.popupManager?.info('Вы вышли из системы');
      context.eventBus.emit(EventType.UI_AUTH_LOGOUT, userInfo);
    }

    return userInfo;
  }
}
