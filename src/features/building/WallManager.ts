import { Scene, AbstractMesh, StandardMaterial, PBRMaterial, Color3 } from "@babylonjs/core";
import { BuildingElement } from "./types";
import { logger } from "../../core/logger/Logger";

const wallLogger = logger.getLogger('WallManager');

export class WallManager {
  private static _instance: WallManager;
  private readonly _walls: BuildingElement[] = [];
  private readonly _wallsByFloor: Map<number, BuildingElement[]> = new Map();
  private _transparent: boolean = false;

  private constructor(private readonly _scene: Scene) {}

  public static getInstance(scene: Scene): WallManager {
    if (!WallManager._instance) {
      WallManager._instance = new WallManager(scene);
    }
    return WallManager._instance;
  }

  public addWall(element: BuildingElement): void {
    this._walls.push(element);
    
    if (element.floorNumber) {
      const walls = this._wallsByFloor.get(element.floorNumber) || [];
      walls.push(element);
      this._wallsByFloor.set(element.floorNumber, walls);
    }
    
    if (element.mesh.material && !element.originalMaterial) {
      element.originalMaterial = element.mesh.material;
    }
    
    element.mesh.renderingGroupId = 0;
  }

  public showWallsForFloor(floorNumber: number): void {
    this.hideAllWalls();
    
    const walls = this._wallsByFloor.get(floorNumber);
    walls?.forEach(wall => {
      wall.mesh.isVisible = true;
      wall.isVisible = true;
    });
    
    this.applyTransparency();
  }

  public showAllWalls(): void {
    this._walls.forEach(wall => {
      wall.mesh.setEnabled(true);
      wall.mesh.isVisible = true;
      wall.isVisible = true;
    });
    
    this.applyTransparency();
  }

  public hideAllWalls(): void {
    this._walls.forEach(wall => {
      wall.mesh.isVisible = false;
      wall.isVisible = false;
    });
  }

  public toggleTransparency(): void {
    this._transparent = !this._transparent;
    this.applyTransparency();
  }

  public setTransparency(transparent: boolean): void {
    if (this._transparent !== transparent) {
      this._transparent = transparent;
      this.applyTransparency();
    }
  }

  private applyTransparency(): void {
    this._walls.forEach(wall => {
      if (!wall.mesh.isVisible || !wall.mesh.material) return;

      const alpha = this._transparent ? 0.5 : 1.0;
      const material = wall.mesh.material;

      if (material instanceof StandardMaterial) {
        material.alpha = alpha;
        material.alphaMode = this._transparent ? 2 : 0;
        material.transparencyMode = this._transparent ? 2 : 0;
        material.backFaceCulling = !this._transparent;
        material.needDepthPrePass = this._transparent;
        
        if (!this._transparent && wall.originalMaterial instanceof StandardMaterial) {
          material.diffuseColor = wall.originalMaterial.diffuseColor.clone();
        }
      } else if (material instanceof PBRMaterial) {
        material.alpha = alpha;
        material.alphaMode = this._transparent ? 2 : 0;
        material.transparencyMode = this._transparent ? 2 : 0;
        material.backFaceCulling = !this._transparent;
        material.needDepthPrePass = this._transparent;
        
        if (!this._transparent && wall.originalMaterial instanceof PBRMaterial) {
          material.albedoColor = wall.originalMaterial.albedoColor.clone();
        }
      }
    });
  }

  public setVisible(visible: boolean): void {
    this._walls.forEach(wall => {
      wall.mesh.isVisible = visible;
      wall.isVisible = visible;
    });
  }

  public get walls(): BuildingElement[] {
    return this._walls;
  }

  public get isTransparent(): boolean {
    return this._transparent;
  }

  public get count(): number {
    return this._walls.length;
  }
}