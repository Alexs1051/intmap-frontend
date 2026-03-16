import { Scene, Vector3, Color3, Ray } from "@babylonjs/core";
import { Marker } from "./Marker";
import { MarkerData, MarkerType, FocusOptions } from "./types";
import { MARKER_CONFIG } from "../../shared/constants";
import { CameraManager } from "../camera/CameraManager";
import { CameraTransform } from "../camera/types";

export class MarkerManager {
  private static _instance: MarkerManager;
  private _scene: Scene;
  private _markers: Map<string, Marker> = new Map();
  private _selectedMarker: Marker | null = null;
  private _hoveredMarker: Marker | null = null;
  private _lastClickTime: number = 0;
  private _doubleClickThreshold: number = 300; // ms
  
  // Ссылка на CameraManager
  private _cameraManager: CameraManager | null = null;
  
  // Флаг инициализации
  private _isInitialized: boolean = false;

  private constructor(scene: Scene) {
    this._scene = scene;
  }

  public static getInstance(scene: Scene): MarkerManager {
    if (!MarkerManager._instance) {
      MarkerManager._instance = new MarkerManager(scene);
    }
    return MarkerManager._instance;
  }

  /**
   * Установить ссылку на CameraManager
   */
  public setCameraManager(cameraManager: CameraManager): void {
    this._cameraManager = cameraManager;
  }

  /**
   * Инициализация менеджера маркеров
   */
  public async initialize(onProgress?: (progress: number) => void): Promise<void> {
    console.log("📍 Инициализация MarkerManager...");
    
    // 0-30%: Подготовка
    if (onProgress) onProgress(0.1);
    
    // 30-60%: Очистка старых маркеров
    if (onProgress) onProgress(0.3);
    this.clearAllMarkers();
    
    // 60-90%: Создание тестовых маркеров
    if (onProgress) onProgress(0.6);
    this.createTestMarkers();
    
    // 90-100%: Финализация
    if (onProgress) onProgress(0.9);
    this._isInitialized = true;
    
    if (onProgress) onProgress(1.0);
    
    console.log(`✅ MarkerManager инициализирован. Маркеров: ${this._markers.size}`);
  }

  /**
   * Сбросить выделение со всех маркеров
   */
  public clearSelection(): void {
    if (this._selectedMarker) {
      this._selectedMarker.setSelected(false);
      this._selectedMarker = null;
      console.log("🔽 Выделение сброшено");
    }
  }

  /**
   * Очистить все маркеры
   */
  public clearAllMarkers(): void {
    this._markers.clear();
    this._selectedMarker = null;
    this._hoveredMarker = null;
  }

  /**
   * Создать новый маркер
   */
  public createMarker(data: MarkerData): Marker {
    const marker = new Marker(this._scene, data);
    
    // Настраиваем обработчики событий
    marker.onClick = (m) => this.handleMarkerClick(m);
    marker.onDoubleClick = (m) => this.handleMarkerDoubleClick(m);
    
    this._markers.set(data.id, marker);
    return marker;
  }

  /**
   * Создать тестовые маркеры с иконками
   */
  public createTestMarkers(): void {
    const testMarkers: MarkerData[] = [
      {
        id: "marker1",
        type: MarkerType.MARKER,
        position: new Vector3(-15, 5, -12),
        title: "ВХОД",
        description: "Главный вход в здание",
        backgroundColor: new Color3(0.2, 0.6, 0.3), // Зелёный
        foregroundColor: new Color3(1, 1, 1), // Белый
        icon: "🚪", // Иконка двери
        floor: 1
      },
      {
        id: "marker2",
        type: MarkerType.MARKER,
        position: new Vector3(12, 15, -8),
        title: "ЛИФТ",
        description: "Лифт на 5 этаж",
        backgroundColor: new Color3(0.8, 0.3, 0.2), // Красный
        foregroundColor: new Color3(1, 1, 1), // Белый
        icon: "🛗", // Иконка лифта
        floor: 5
      },
      {
        id: "marker3",
        type: MarkerType.MARKER,
        position: new Vector3(5, 25, 15),
        title: "КОНФЕРЕНЦ-ЗАЛ",
        description: "Конференц-зал на 50 человек",
        backgroundColor: new Color3(0.2, 0.3, 0.8), // Синий
        foregroundColor: new Color3(1, 1, 1), // Белый
        icon: "📊", // Иконка презентации
        floor: 8
      }
    ];

    testMarkers.forEach(data => this.createMarker(data));
    console.log(`📌 Создано ${testMarkers.length} тестовых маркеров с иконками`);
  }

  private handleMarkerClick(marker: Marker): void {
    console.log(`📍 Клик по маркеру: ${marker.id} (${marker.data.title})`);
    
    // Если кликнули по тому же маркеру, который уже выделен - ничего не делаем
    if (this._selectedMarker === marker) {
      return;
    }
    
    // Снимаем выделение с предыдущего маркера
    if (this._selectedMarker) {
      this._selectedMarker.setSelected(false);
    }
    
    // Выделяем новый маркер
    marker.setSelected(true);
    this._selectedMarker = marker;
  }

  private handleMarkerDoubleClick(marker: Marker): void {
    console.log(`👆 Двойной клик по маркеру: ${marker.id} (${marker.data.title})`);
    
    // Снимаем выделение с предыдущего маркера
    if (this._selectedMarker && this._selectedMarker !== marker) {
      this._selectedMarker.setSelected(false);
    }
    
    // Выделяем новый маркер
    marker.setSelected(true);
    this._selectedMarker = marker;
    
    // Фокусируемся на маркере
    this.focusOnMarker(marker, {
      distance: 8,
      duration: 1.2
    });
  }

  /**
   * Обновить все маркеры
   */
  public update(cameraPosition: Vector3): void {
    this._markers.forEach(marker => {
      marker.update(cameraPosition);
      marker.updateScale(cameraPosition);
    });
  }

  /**
   * Обработка клика по сцене
   */
  public handleScenePick(ray: Ray): boolean {
    // Сначала проверяем, попали ли в какой-нибудь маркер через пикер сцены
    const pickResult = this._scene.pickWithRay(ray, (mesh) => {
      // Проверяем, принадлежит ли меш маркеру
      return mesh.metadata?.widget !== undefined;
    });

    if (pickResult?.hit) {
      // Нашли маркер по мешу
      const hitMarker = this.findMarkerByMesh(pickResult.pickedMesh);
      
      if (hitMarker) {
        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - this._lastClickTime;
        
        if (timeSinceLastClick < this._doubleClickThreshold) {
          // Двойной клик
          hitMarker.handleDoubleClick();
          this._lastClickTime = 0;
        } else {
          // Одинарный клик
          hitMarker.handleClick();
          this._lastClickTime = currentTime;
        }
        
        return true;
      }
    }
    
    // Кликнули в пустоту - сбрасываем выделение
    this.clearSelection();
    return false;
  }

  /**
   * Найти маркер по мешу
   */
  private findMarkerByMesh(mesh: any): Marker | null {
    if (!mesh?.metadata?.widget) return null;
    
    // Ищем маркер, у которого совпадает меш
    for (const marker of this._markers.values()) {
      if (marker.mesh === mesh) {
        return marker;
      }
    }
    return null;
  }

  /**
   * Фокус камеры на маркере
   */
  public async focusOnMarker(marker: Marker, options?: FocusOptions): Promise<void> {
    if (!this._cameraManager) {
      console.warn("CameraManager не установлен, фокус невозможен");
      return;
    }

    if (this._cameraManager.isAnimating) {
      console.log("Камера уже анимируется, ждём...");
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

    console.log(`🎯 Фокус на маркер ${marker.id}`, {
      position: position.toString(),
      distance,
      duration
    });

    await this._cameraManager['_animator'].animateTo(targetTransform, duration);
    this._cameraManager.camera.target = position.clone();
  }

  /**
   * Получить маркер по ID
   */
  public getMarker(id: string): Marker | undefined {
    return this._markers.get(id);
  }

  /**
   * Получить все маркеры
   */
  public getAllMarkers(): Marker[] {
    return Array.from(this._markers.values());
  }

  /**
   * Удалить маркер
   */
  public removeMarker(id: string): boolean {
    return this._markers.delete(id);
  }

  /**
   * Получить выделенный маркер
   */
  public get selectedMarker(): Marker | null {
    return this._selectedMarker;
  }

  /**
   * Проверить, инициализирован ли менеджер
   */
  public get isInitialized(): boolean {
    return this._isInitialized;
  }
}