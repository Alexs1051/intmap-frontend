import { Scene, Vector3, Color3, Ray } from "@babylonjs/core";
import { Marker } from "./Marker";
import { MarkerData, MarkerType, FocusOptions } from "./types";
import { MARKER_CONFIG } from "../../shared/constants";
import { CameraManager } from "../camera/CameraManager";
import { CameraTransform } from "../camera/types";
import { logger } from "../../core/logger/Logger";

import entranceDescription from './descriptions/entrance.md';
import elevatorDescription from './descriptions/elevator.md';
import conferenceDescription from './descriptions/conference.md';

const markerLogger = logger.getLogger('MarkerManager');

export class MarkerManager {
  private static _instance: MarkerManager;
  private _scene: Scene;
  private _markers: Map<string, Marker> = new Map();
  private _selectedMarker: Marker | null = null;
  private _hoveredMarker: Marker | null = null;
  private _lastClickTime: number = 0;
  private readonly _doubleClickThreshold: number = 300;
  
  private _cameraManager: CameraManager | null = null;
  private _isInitialized: boolean = false;
  private _onMarkerSelectedCallback: ((marker: Marker | null) => void) | null = null;

  private constructor(scene: Scene) {
    this._scene = scene;
  }

  public static getInstance(scene: Scene): MarkerManager {
    if (!MarkerManager._instance) {
      MarkerManager._instance = new MarkerManager(scene);
    }
    return MarkerManager._instance;
  }

  public setCameraManager(cameraManager: CameraManager): void {
    this._cameraManager = cameraManager;
  }

  public async initialize(onProgress?: (progress: number) => void): Promise<void> {
    markerLogger.debug("Инициализация MarkerManager");
    
    onProgress?.(0.1);
    onProgress?.(0.3);
    this.clearAllMarkers();
    
    onProgress?.(0.6);
    this.createTestMarkers();
    
    onProgress?.(0.9);
    this._isInitialized = true;
    onProgress?.(1.0);
    
    markerLogger.info(`MarkerManager инициализирован. Маркеров: ${this._markers.size}`);
  }

  public clearSelection(): void {
    if (this._selectedMarker) {
      this._selectedMarker.setSelected(false);
      this._selectedMarker = null;
      this._onMarkerSelectedCallback?.(null);
    }
  }

  public clearAllMarkers(): void {
    this._markers.clear();
    this._selectedMarker = null;
    this._hoveredMarker = null;
  }

  public createMarker(data: MarkerData): Marker {
    const marker = new Marker(this._scene, data);
    marker.onClick = (m) => this.handleMarkerClick(m);
    marker.onDoubleClick = (m) => this.handleMarkerDoubleClick(m);
    
    this._markers.set(data.id, marker);
    return marker;
  }

  private createTestMarkers(): void {
    const testMarkers: MarkerData[] = [
      {
        id: "entrance",
        type: MarkerType.MARKER,
        position: new Vector3(-15, 5, -12),
        title: "ГЛАВНЫЙ ВХОД",
        description: entranceDescription,
        backgroundColor: new Color3(0.2, 0.6, 0.3),
        foregroundColor: new Color3(1, 1, 1),
        icon: "🚪",
        floor: 1
      },
      {
        id: "elevator",
        type: MarkerType.MARKER,
        position: new Vector3(12, 15, -8),
        title: "ЛИФТ",
        description: elevatorDescription,
        backgroundColor: new Color3(0.8, 0.3, 0.2),
        foregroundColor: new Color3(1, 1, 1),
        icon: "🛗",
        floor: 5
      },
      {
        id: "conference",
        type: MarkerType.MARKER,
        position: new Vector3(5, 25, 15),
        title: "КОНФЕРЕНЦ-ЗАЛ",
        description: conferenceDescription,
        backgroundColor: new Color3(0.2, 0.3, 0.8),
        foregroundColor: new Color3(1, 1, 1),
        icon: "📊",
        floor: 8
      }
    ];

    testMarkers.forEach(data => this.createMarker(data));
    markerLogger.info(`Создано ${testMarkers.length} тестовых маркеров с расширенными описаниями`);
  }

  private handleMarkerClick(marker: Marker): void {
    markerLogger.debug(`Клик по маркеру: ${marker.id} (${marker.data.title})`);
    
    if (this._selectedMarker === marker) return;
    
    this._selectedMarker?.setSelected(false);
    marker.setSelected(true);
    this._selectedMarker = marker;
    this._onMarkerSelectedCallback?.(marker);
  }

  private handleMarkerDoubleClick(marker: Marker): void {
    markerLogger.debug(`Двойной клик по маркеру: ${marker.id} (${marker.data.title})`);
    
    if (this._selectedMarker && this._selectedMarker !== marker) {
      this._selectedMarker.setSelected(false);
    }
    
    marker.setSelected(true);
    this._selectedMarker = marker;
    
    this.focusOnMarker(marker, { distance: 8, duration: 1.2 });
  }

  public update(cameraPosition: Vector3): void {
    this._markers.forEach(marker => {
      marker.update(cameraPosition);
      marker.updateScale(cameraPosition);
    });
  }

  public handleScenePick(ray: Ray): boolean {
    const pickResult = this._scene.pickWithRay(ray, (mesh) => mesh.metadata?.widget !== undefined);

    if (pickResult?.hit) {
      const hitMarker = this.findMarkerByMesh(pickResult.pickedMesh);
      
      if (hitMarker) {
        const now = Date.now();
        const timeSinceLast = now - this._lastClickTime;
        
        if (timeSinceLast < this._doubleClickThreshold) {
          hitMarker.handleDoubleClick();
          this._lastClickTime = 0;
        } else {
          hitMarker.handleClick();
          this._lastClickTime = now;
        }
        return true;
      }
    }
    
    this.clearSelection();
    return false;
  }

  private findMarkerByMesh(mesh: any): Marker | null {
    if (!mesh?.metadata?.widget) return null;
    
    for (const marker of this._markers.values()) {
      if (marker.mesh === mesh) return marker;
    }
    return null;
  }

  public async focusOnMarker(marker: Marker, options?: FocusOptions): Promise<void> {
    if (!this._cameraManager) {
      markerLogger.warn("CameraManager не установлен");
      return;
    }

    if (this._cameraManager.isAnimating) {
      markerLogger.debug("Камера уже анимируется");
      return;
    }

    const position = marker.position;
    const distance = options?.distance || MARKER_CONFIG.focusDistance;
    const duration = options?.duration || 1.0;
    
    const targetTransform: CameraTransform = {
      alpha: this._cameraManager.camera.alpha,
      beta: this._cameraManager.camera.beta,
      radius: distance,
      target: position.clone()
    };

    markerLogger.debug(`Фокус на маркер ${marker.id}`, { distance, duration });
    await this._cameraManager['_animator'].animateTo(targetTransform, duration);
    this._cameraManager.camera.target = position.clone();
  }

  public getMarker(id: string): Marker | undefined {
    return this._markers.get(id);
  }

  public getAllMarkers(): Marker[] {
    return Array.from(this._markers.values());
  }

  public removeMarker(id: string): boolean {
    return this._markers.delete(id);
  }

  public setOnMarkerSelected(callback: (marker: Marker | null) => void): void {
    this._onMarkerSelectedCallback = callback;
  }

  public get selectedMarker(): Marker | null {
    return this._selectedMarker;
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }
}