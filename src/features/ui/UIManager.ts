import { Scene } from "@babylonjs/core";
import { CameraManager } from "../camera/CameraManager";
import { BuildingManager } from "../building/BuildingManager";
import { ControlPanel } from "./components/ControlPanel";
import { UIEvent, UIEventType, CameraMode } from "../../shared/types";

export class UIManager {
  private static _instance: UIManager;
  private _scene: Scene;
  private _cameraManager: CameraManager;
  private _buildingManager: BuildingManager;
  private _controlPanel: ControlPanel;
  
  // Состояния
  private _currentViewMode: 'building' | 'floor' = 'building';
  private _wallsTransparent: boolean = false;

  private constructor(scene: Scene, cameraManager: CameraManager) {
    this._scene = scene;
    this._cameraManager = cameraManager;
    this._buildingManager = BuildingManager.getInstance(scene);
    
    this._controlPanel = new ControlPanel(cameraManager.modeManager);
    this.setupEventListeners();
    this.updateButtonStates();
    this.updateFloorButtons();
  }

  public static getInstance(scene: Scene, cameraManager: CameraManager): UIManager {
    if (!UIManager._instance) {
      UIManager._instance = new UIManager(scene, cameraManager);
    }
    return UIManager._instance;
  }

  private setupEventListeners(): void {
    this._controlPanel.addEventListener(async (event: UIEvent) => {
      if (!this._cameraManager.canInteractWithUI()) {
        console.log("UI interaction blocked - camera is animating");
        return;
      }

      console.log(`UI Event: ${UIEventType[event.type]}`);

      switch (event.type) {
        case UIEventType.CAMERA_MODE_TOGGLE:
          await this._cameraManager.toggleCameraMode();
          break;
          
        case UIEventType.RESET_CAMERA:  // <-- Вернули
          await this._cameraManager.resetCamera();
          break;
          
        case UIEventType.VIEW_MODE_TOGGLE:
          this.toggleViewMode();
          break;
          
        case UIEventType.WALLS_TRANSPARENCY_TOGGLE:
          this.toggleWallsTransparency();
          break;
          
        case UIEventType.NEXT_FLOOR:
          this.nextFloor();
          break;
          
        case UIEventType.PREVIOUS_FLOOR:
          this.previousFloor();
          break;
      }
      
      this.updateButtonStates();
      this.updateFloorButtons();
    });
  }

  private toggleViewMode(): void {
    this._currentViewMode = this._currentViewMode === 'building' ? 'floor' : 'building';
    
    if (this._currentViewMode === 'building') {
      console.log("🏢 Показываю все этажи");
      this._buildingManager.floorManager.showAllFloors();
    } else {
      const currentFloor = this._cameraManager.currentFloor;
      console.log(`📌 Показываю этаж ${currentFloor}`);
      this._buildingManager.floorManager.showFloor(currentFloor);
    }
    
    this.updateFloorButtons();
  }

  private toggleWallsTransparency(): void {
    this._wallsTransparent = !this._wallsTransparent;
    this._buildingManager.wallManager.setTransparency(this._wallsTransparent);
    console.log(`🧱 Прозрачность стен: ${this._wallsTransparent ? 'вкл' : 'выкл'}`);
  }

  private nextFloor(): void {
    this._cameraManager.nextFloor();
    const currentFloor = this._cameraManager.currentFloor;
    
    if (this._currentViewMode === 'floor') {
      this._buildingManager.floorManager.showFloor(currentFloor);
    }
    
    console.log(`📌 Текущий этаж: ${currentFloor}`);
    this.updateFloorButtons();
  }

  private previousFloor(): void {
    this._cameraManager.previousFloor();
    const currentFloor = this._cameraManager.currentFloor;
    
    if (this._currentViewMode === 'floor') {
      this._buildingManager.floorManager.showFloor(currentFloor);
    }
    
    console.log(`📌 Текущий этаж: ${currentFloor}`);
    this.updateFloorButtons();
  }

  private updateButtonStates(): void {
    this._controlPanel.updateButtonState('2d', this._cameraManager.cameraMode === CameraMode.MODE_2D);
    this._controlPanel.updateButtonState('walls', this._wallsTransparent);
    this._controlPanel.updateButtonState('view', this._currentViewMode === 'floor');
    // reset camera не имеет состояния active/not active, поэтому не обновляем
  }

  private updateFloorButtons(): void {
    const maxFloor = this._buildingManager.floorManager.floorCount;
    const currentFloor = this._cameraManager.currentFloor;
    
    this._controlPanel.updateFloorButtons(
      this._currentViewMode === 'floor' ? currentFloor : 0,
      this._currentViewMode === 'floor' ? maxFloor : 0
    );
  }
}