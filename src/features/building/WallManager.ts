import { Scene, AbstractMesh, StandardMaterial, PBRMaterial, Color3 } from "@babylonjs/core";
import { BuildingElement } from "./types";

export class WallManager {
  private static _instance: WallManager;
  private _scene: Scene;
  private _walls: BuildingElement[] = [];
  private _wallsByFloor: Map<number, BuildingElement[]> = new Map();
  private _transparent: boolean = false;

  private constructor(scene: Scene) {
    this._scene = scene;
  }

  public static getInstance(scene: Scene): WallManager {
    if (!WallManager._instance) {
      WallManager._instance = new WallManager(scene);
    }
    return WallManager._instance;
  }

  /**
   * Добавить стену
   */
  public addWall(element: BuildingElement): void {
    console.log(`    🧱 WallManager добавляет стену: ${element.name}, этаж ${element.floorNumber}`);
    this._walls.push(element);
    
    // Группируем по этажам
    if (element.floorNumber) {
      if (!this._wallsByFloor.has(element.floorNumber)) {
        this._wallsByFloor.set(element.floorNumber, []);
      }
      this._wallsByFloor.get(element.floorNumber)!.push(element);
    }
    
    // Сохраняем оригинальный материал
    if (element.mesh.material && !element.originalMaterial) {
      element.originalMaterial = element.mesh.material;
    }

    // ВАЖНО: Устанавливаем rendering group для прозрачных объектов
    // Прозрачные объекты должны рендериться после непрозрачных
    element.mesh.renderingGroupId = 0; // 0 - непрозрачные, 1 - прозрачные
  }

  /**
   * Показать стены только для конкретного этажа
   */
  public showWallsForFloor(floorNumber: number): void {
    console.log(`  🧱 Показываю стены для этажа ${floorNumber}`);
    
    // Сначала скрываем все стены
    this.hideAllWalls();
    
    // Показываем стены нужного этажа
    const wallsForFloor = this._wallsByFloor.get(floorNumber);
    if (wallsForFloor) {
      wallsForFloor.forEach(wall => {
        wall.mesh.isVisible = true;
        wall.isVisible = true;
      });
      console.log(`    Показано стен: ${wallsForFloor.length}`);
    }
    
    // Применяем текущий режим прозрачности
    this.applyTransparency();
  }

  /**
   * Показать все стены
   */
  public showAllWalls(): void {
    console.log(`  🧱 Показываю все стены (${this._walls.length})`);
    this._walls.forEach(wall => {
      wall.mesh.setEnabled(true);
      wall.mesh.isVisible = true;
      wall.isVisible = true;
    });
    
    // Применяем текущий режим прозрачности
    this.applyTransparency();
  }

  /**
   * Скрыть все стены
   */
  public hideAllWalls(): void {
    this._walls.forEach(wall => {
      wall.mesh.isVisible = false;
      wall.isVisible = false;
    });
  }

  /**
   * Переключить прозрачность всех стен
   */
  public toggleTransparency(): void {
    this._transparent = !this._transparent;
    this.applyTransparency();
    
    console.log(`🔄 Прозрачность стен: ${this._transparent ? 'включена' : 'выключена'}`);
  }

  /**
   * Установить прозрачность
   */
  public setTransparency(transparent: boolean): void {
    if (this._transparent !== transparent) {
      this._transparent = transparent;
      this.applyTransparency();
    }
  }

  /**
   * Применить прозрачность ко всем стенам
   */
  private applyTransparency(): void {
    console.log(`  Применение прозрачности к ${this._walls.length} стенам`);
    
    this._walls.forEach(wall => {
      // Применяем только к видимым стенам
      if (!wall.mesh.isVisible) return;
      
      if (wall.mesh.material) {
        // Для StandardMaterial
        if (wall.mesh.material instanceof StandardMaterial) {
          if (this._transparent) {
            // Настройка прозрачности
            wall.mesh.material.alpha = 0.5;
            wall.mesh.material.alphaMode = 2;
            wall.mesh.material.transparencyMode = 2;
            wall.mesh.material.backFaceCulling = false;
            wall.mesh.material.needDepthPrePass = true;
            
            // ВАЖНО: Переключаем группу рендеринга на прозрачную
            wall.mesh.renderingGroupId = 0;
            
            // Сохраняем цвет
            if (wall.originalMaterial instanceof StandardMaterial) {
              wall.mesh.material.diffuseColor = wall.originalMaterial.diffuseColor.clone();
            } else {
              wall.mesh.material.diffuseColor = new Color3(1, 1, 1);
            }
          } else {
            // Возвращаем непрозрачность
            wall.mesh.material.alpha = 1.0;
            wall.mesh.material.alphaMode = 0;
            wall.mesh.material.transparencyMode = 0;
            wall.mesh.material.needDepthPrePass = false;
            
            // ВАЖНО: Возвращаем в непрозрачную группу
            wall.mesh.renderingGroupId = 0;
            
            // Возвращаем оригинальный цвет
            if (wall.originalMaterial instanceof StandardMaterial) {
              wall.mesh.material.diffuseColor = wall.originalMaterial.diffuseColor.clone();
            }
          }
        }
        // Для PBRMaterial
        else if (wall.mesh.material instanceof PBRMaterial) {
          if (this._transparent) {
            wall.mesh.material.alpha = 0.5;
            wall.mesh.material.alphaMode = 2;
            wall.mesh.material.transparencyMode = 2;
            wall.mesh.material.backFaceCulling = false;
            wall.mesh.material.needDepthPrePass = true;
            
            wall.mesh.renderingGroupId = 0;
            
            if (wall.originalMaterial instanceof PBRMaterial) {
              wall.mesh.material.albedoColor = wall.originalMaterial.albedoColor.clone();
            } else {
              wall.mesh.material.albedoColor = new Color3(1, 1, 1);
            }
          } else {
            wall.mesh.material.alpha = 1.0;
            wall.mesh.material.alphaMode = 0;
            wall.mesh.material.transparencyMode = 0;
            wall.mesh.material.needDepthPrePass = false;
            
            wall.mesh.renderingGroupId = 0;
            
            if (wall.originalMaterial instanceof PBRMaterial) {
              wall.mesh.material.albedoColor = wall.originalMaterial.albedoColor.clone();
            }
          }
        }
      }
    });
  }

  /**
   * Показать/скрыть стены
   */
  public setVisible(visible: boolean): void {
    this._walls.forEach(wall => {
      wall.mesh.isVisible = visible;
      wall.isVisible = visible;
    });
  }

  // Геттеры
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