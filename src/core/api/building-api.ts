import type { BuildingOption } from "@shared/types";
import { apiFetch, getApiBaseUrl } from "./api-client";

interface BackendBuildingDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

interface BackendBuildingModelInfoDto {
  buildingId: string;
  revisionId: string;
  name: string;
  code: string;
  version: string;
  modelUrl: string;
  objectKey: string;
}

interface BackendBuildingAssetDto {
  id: string;
  buildingRevisionId: string;
  assetType: string;
  floorNumber?: number | null;
  roomKey?: string | null;
  modelUrl: string;
}

export class BuildingApi {
  private readonly baseUrl: string;

  constructor(baseUrl: string = getApiBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public async getBuildingOptions(): Promise<BuildingOption[]> {
    const buildingsResponse = await apiFetch(`${this.baseUrl}/buildings`);

    if (!buildingsResponse.ok) {
      throw new Error(`Failed to load buildings: ${buildingsResponse.status}`);
    }

    const buildings = await buildingsResponse.json() as BackendBuildingDto[];

    const modelInfos = await Promise.all(
      buildings.map(async (building) => {
        const [infoResponse, assetsResponse] = await Promise.all([
          apiFetch(`${this.baseUrl}/buildings/${building.id}/model-info`),
          apiFetch(`${this.baseUrl}/buildings/${building.id}/assets`)
        ]);

        if (!infoResponse.ok) {
          throw new Error(`Failed to load model info for ${building.id}: ${infoResponse.status}`);
        }

        if (!assetsResponse.ok) {
          throw new Error(`Failed to load assets for ${building.id}: ${assetsResponse.status}`);
        }

        return {
          info: await infoResponse.json() as BackendBuildingModelInfoDto,
          assets: await assetsResponse.json() as BackendBuildingAssetDto[]
        };
      })
    );

    return modelInfos.map(({ info, assets }) => {
      const selectedAssetUrls = this.pickPreferredAssetUrls(assets);
      const fallbackModelUrl = this.normalizeAssetUrl(info.modelUrl);
      return {
        id: info.code,
        backendId: info.buildingId,
        buildingCode: info.code,
        name: info.name,
        modelUrl: selectedAssetUrls[0] ?? fallbackModelUrl,
        modelUrls: selectedAssetUrls.length > 0 ? selectedAssetUrls : [fallbackModelUrl],
        iconPath: this.getIconPath(info.code)
      };
    });
  }

  private pickPreferredAssetUrls(assets: BackendBuildingAssetDto[]): string[] {
    const fullAsset = assets.find((asset) => asset.assetType === 'FULL');
    if (fullAsset) {
      return [fullAsset.modelUrl];
    }

    const floorAssets = assets
      .filter((asset) => asset.assetType === 'FLOOR')
      .sort((left, right) => (left.floorNumber ?? 0) - (right.floorNumber ?? 0));

    return floorAssets.map((asset) => this.normalizeAssetUrl(asset.modelUrl));
  }

  private getIconPath(buildingCode: string): string {
    void buildingCode;
    return 'icons/ui/object.png';
  }

  private normalizeAssetUrl(modelUrl: string): string {
    if (typeof window === 'undefined' || !window.location?.origin) {
      return modelUrl;
    }

    try {
      const parsedUrl = new URL(modelUrl, window.location.origin);
      const currentOrigin = new URL(window.location.origin);

      if (parsedUrl.hostname !== currentOrigin.hostname) {
        return parsedUrl.toString();
      }

      // Reuse the current secure origin so model file requests do not fall back to
      // backend-generated absolute http URLs behind reverse proxies.
      return `${window.location.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch {
      return modelUrl;
    }
  }
}
