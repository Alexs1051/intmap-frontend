import { Vector3 } from "@babylonjs/core";
import { MarkerType, type MarkerConnection, type MarkerData, type UserInfo, type RGBA } from "@shared/types";
import { apiFetch, getApiBaseUrl } from "./api-client";
import { Logger } from "@core/logger/logger";
import { convertParsedToMarkerData } from "@features/markers/marker-helpers";
import type { ParsedMarker } from "@shared/types";

interface BackendMarkerDto {
  id: string;
  externalId?: string;
  external_id?: string;
  type: string;
  name: string;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  position_x?: number;
  position_y?: number;
  position_z?: number;
  floorNumber?: number;
  floor_number?: number;
  roomKey?: string | null;
  room_key?: string | null;
  sourceNodeId?: string | null;
  source_node_id?: string | null;
  description?: string | null;
  iconName?: string | null;
  icon_name?: string | null;
  publicToken?: string | null;
  public_token?: string | null;
  qrCodeData?: string | null;
  qr_code_data?: string | null;
  requiredRole?: string | null;
  required_role?: string | null;
  gatewayMessage?: string | null;
  gateway_message?: string | null;
  isActive?: boolean;
  is_active?: boolean;
}

interface BackendConnectionDto {
  id: string;
  fromMarkerId: string;
  toMarkerId: string;
  distance?: number | null;
  connectionType: string;
  weight: number;
  isBidirectional: boolean;
  direction: string;
}

const DEFAULT_COLORS: Record<MarkerType, { backgroundColor: RGBA; textColor: RGBA }> = {
  [MarkerType.MARKER]: {
    backgroundColor: { r: 0.29, g: 0.56, b: 0.85, a: 0.9 },
    textColor: { r: 1, g: 1, b: 1, a: 1 }
  },
  [MarkerType.FLAG]: {
    backgroundColor: { r: 0.91, g: 0.3, b: 0.24, a: 0.9 },
    textColor: { r: 1, g: 1, b: 1, a: 1 }
  },
  [MarkerType.GATEWAY]: {
    backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
    textColor: { r: 0.95, g: 0.25, b: 0.2, a: 1 }
  },
  [MarkerType.WAYPOINT]: {
    backgroundColor: { r: 0.18, g: 0.8, b: 0.44, a: 0.9 },
    textColor: { r: 1, g: 1, b: 1, a: 1 }
  }
};

function toMarkerType(type: string): MarkerType {
  switch (type.trim().toUpperCase()) {
    case 'FLAG':
      return MarkerType.FLAG;
    case 'GATEWAY':
      return MarkerType.GATEWAY;
    case 'WAYPOINT':
      return MarkerType.WAYPOINT;
    default:
      return MarkerType.MARKER;
  }
}

function normalizeRole(role?: string | null): UserInfo['role'] | undefined {
  if (!role) {
    return undefined;
  }

  switch (role.trim().toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'user':
      return 'user';
    default:
      return 'guest';
  }
}

export class MarkerApi {
  private readonly baseUrl: string;
  private readonly logger = Logger.getInstance().getLogger('MarkerApi');

  constructor(baseUrl: string = getApiBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public async getMarkers(buildingBackendId: string): Promise<BackendMarkerDto[]> {
    const response = await apiFetch(`${this.baseUrl}/markers/building/${buildingBackendId}`);

    if (!response.ok) {
      throw new Error(`Failed to load markers: ${response.status}`);
    }

    return await response.json() as BackendMarkerDto[];
  }

  public async getConnections(buildingBackendId: string): Promise<BackendConnectionDto[]> {
    const response = await apiFetch(`${this.baseUrl}/connections/building/${buildingBackendId}`);

    if (!response.ok) {
      throw new Error(`Failed to load connections: ${response.status}`);
    }

    return await response.json() as BackendConnectionDto[];
  }

  public async getMarkerGraph(
    buildingBackendId: string,
    buildingCode: string,
    userRole: UserInfo['role'],
    parsedMarkers?: Map<string, ParsedMarker>
  ): Promise<MarkerData[]> {
    const [markers, connections] = await Promise.all([
      this.getMarkers(buildingBackendId),
      this.getConnections(buildingBackendId)
    ]);
    this.logger.info(`Backend marker payload loaded for ${buildingCode}`, {
      markers: markers.length,
      connections: connections.length
    });

    const connectionsByMarker = new Map<string, MarkerConnection[]>();

    connections.forEach((connection) => {
      const fromLinks = connectionsByMarker.get(connection.fromMarkerId) ?? [];
      fromLinks.push({
        fromId: connection.fromMarkerId,
        toId: connection.toMarkerId,
        direction: connection.direction === 'ONE_WAY' ? 'one-way' : 'two-way',
        weight: connection.weight
      });
      connectionsByMarker.set(connection.fromMarkerId, fromLinks);

      if (connection.direction === 'TWO_WAY') {
        const reverseLinks = connectionsByMarker.get(connection.toMarkerId) ?? [];
        reverseLinks.push({
          fromId: connection.toMarkerId,
          toId: connection.fromMarkerId,
          direction: 'two-way',
          weight: connection.weight
        });
        connectionsByMarker.set(connection.toMarkerId, reverseLinks);
      }
    });

    return markers
      .filter((marker) => (marker.isActive ?? marker.is_active ?? false))
      .map((marker) => {
        const markerType = toMarkerType(marker.type);
        const colors = DEFAULT_COLORS[markerType];
        const requiredRole = normalizeRole(marker.requiredRole ?? marker.required_role);
        const hasAccess = !requiredRole || (userRole === 'admin') || (userRole === 'user' && requiredRole !== 'admin');
        const positionX = marker.positionX ?? marker.position_x ?? 0;
        const positionY = marker.positionY ?? marker.position_y ?? 0;
        const positionZ = marker.positionZ ?? marker.position_z ?? 0;
        const floorNumber = marker.floorNumber ?? marker.floor_number ?? 1;
        const roomKey = marker.roomKey ?? marker.room_key ?? undefined;
        const iconName = marker.iconName ?? marker.icon_name ?? undefined;
        const publicToken = marker.publicToken ?? marker.public_token ?? undefined;
        const qrCodeData = marker.qrCodeData ?? marker.qr_code_data ?? undefined;
        const externalId = marker.externalId ?? marker.external_id ?? marker.id;
        const parsedMarker = parsedMarkers?.get(externalId);
        const parsedMarkerData = parsedMarker ? convertParsedToMarkerData(parsedMarker) : null;

        return {
          id: marker.id,
          name: marker.name,
          type: markerType,
          position: parsedMarkerData?.position ?? new Vector3(positionX, positionY, positionZ),
          floor: parsedMarkerData?.floor ?? floorNumber,
          roomId: parsedMarkerData?.roomId ?? roomKey,
          description: marker.description ?? parsedMarkerData?.description ?? undefined,
          iconName: iconName ?? parsedMarkerData?.iconName ?? this.getDefaultIcon(markerType, hasAccess),
          backgroundColor: parsedMarkerData?.backgroundColor ?? colors.backgroundColor,
          textColor: parsedMarkerData?.textColor ?? (markerType === MarkerType.GATEWAY && hasAccess
            ? { r: 0.95, g: 0.8, b: 0.2, a: 1 }
            : colors.textColor),
          connections: connectionsByMarker.get(marker.id) ?? [],
          requiredRole,
          hasAccess,
          isBlocked: markerType === MarkerType.GATEWAY ? !hasAccess : false,
          blockedMessage: markerType === MarkerType.GATEWAY && !hasAccess ? 'Нет доступа' : undefined,
          qr: qrCodeData ?? this.buildFallbackQr(buildingCode, publicToken),
          accessRights: requiredRole ? [requiredRole] : []
        } satisfies MarkerData;
      });
  }

  private getDefaultIcon(markerType: MarkerType, hasAccess: boolean): string {
    switch (markerType) {
      case MarkerType.FLAG:
        return 'flag';
      case MarkerType.GATEWAY:
        return hasAccess ? 'gateway-allowed' : 'gateway-blocked';
      case MarkerType.WAYPOINT:
        return 'circle';
      default:
        return 'location_on';
    }
  }

  private buildFallbackQr(buildingCode: string, publicToken?: string | null): string | undefined {
    if (!publicToken) {
      return undefined;
    }

    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}/?b=${encodeURIComponent(buildingCode)}&f=${encodeURIComponent(publicToken)}`;
    }

    return `intmap://flag/${buildingCode}/${publicToken}`;
  }
}
