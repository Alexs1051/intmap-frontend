import { apiFetch, getApiBaseUrl } from "./api-client";

export class RouteApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface BackendRouteStepDto {
  connectionId: string;
  fromMarkerId: string;
  toMarkerId: string;
  connectionType: string;
  direction: string;
  weight: number;
  distance?: number | null;
}

interface BackendRouteDto {
  buildingId: string;
  revisionId: string;
  fromMarkerId: string;
  toMarkerId: string;
  markerIds: string[];
  connectionIds: string[];
  totalWeight: number;
  totalDistance: number;
  steps: BackendRouteStepDto[];
  isPartial?: boolean;
  usedAlternateRoute?: boolean;
  blockedGatewayId?: string | null;
  blockedGatewayName?: string | null;
  message?: string | null;
}

export class RouteApi {
  private readonly baseUrl: string;

  constructor(baseUrl: string = getApiBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public async findRoute(buildingBackendId: string, fromMarkerId: string, toMarkerId: string): Promise<BackendRouteDto> {
    const params = new URLSearchParams({
      from: fromMarkerId,
      to: toMarkerId
    });

    const response = await apiFetch(`${this.baseUrl}/routes/building/${buildingBackendId}?${params.toString()}`);

    if (!response.ok) {
      throw new RouteApiError(`Failed to load route: ${response.status}`, response.status);
    }

    return await response.json() as BackendRouteDto;
  }
}
