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
      return {
        id: info.code,
        backendId: info.buildingId,
        buildingCode: info.code,
        name: info.name,
        modelUrl: selectedAssetUrls[0] ?? info.modelUrl,
        modelUrls: selectedAssetUrls.length > 0 ? selectedAssetUrls : [info.modelUrl],
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

    return floorAssets.map((asset) => asset.modelUrl);
  }

  private getIconPath(buildingCode: string): string {
    void buildingCode;
    return 'icons/ui/object.png';
  }
}
