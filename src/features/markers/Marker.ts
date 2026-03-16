import { Scene, Vector3, Mesh, Ray } from "@babylonjs/core";
import { MarkerWidget } from "./components/MarkerWidget";
import { MarkerData, MarkerType } from "./types";
import { MARKER_CONFIG } from "../../shared/constants";

export class Marker {
  private _id: string;
  private _type: MarkerType;
  private _widget: MarkerWidget;
  private _data: MarkerData;
  private _isSelected: boolean = false;
  private _isHovered: boolean = false;
  
  // События
  public onClick: (marker: Marker) => void = () => {};
  public onDoubleClick: (marker: Marker) => void = () => {};
  public onHover: (marker: Marker) => void = () => {};
  public onBlur: (marker: Marker) => void = () => {};

  constructor(scene: Scene, data: MarkerData) {
    this._id = data.id;
    this._type = data.type;
    this._data = data;

    // Создаём визуальный виджет
    this._widget = new MarkerWidget(
      scene,
      data.position,
      data.backgroundColor,
      data.foregroundColor,
      data.icon || "📍",
      data.title || "",
      data.size || MARKER_CONFIG.defaultSize
    );
  }

  /**
   * Обновить билборд (вызывается каждый кадр)
   */
  public update(cameraPosition: Vector3): void {
    this._widget.updateBillboard(cameraPosition);
  }

  /**
   * Обновить масштаб маркера на основе расстояния до камеры
   */
  public updateScale(cameraPosition: Vector3): void {
    this._widget.updateScale(cameraPosition);
  }

  /**
   * Обработка клика
   */
  public handleClick(): void {
    this.onClick(this);
  }

  /**
   * Обработка двойного клика
   */
  public handleDoubleClick(): void {
    this.onDoubleClick(this);
  }

  /**
   * Установить состояние выделения
   */
  public setSelected(selected: boolean): void {
    if (this._isSelected === selected) return;
    
    this._isSelected = selected;
    this._widget.setSelected(selected, MARKER_CONFIG.selectedOutlineColor);
  }

  /**
   * Проверить, попадает ли луч в маркер
   */
  public intersects(ray: Ray): boolean {
    try {
      const markerPos = this._widget.position;
      const rayOrigin = ray.origin;
      const rayDirection = ray.direction;
      
      const toMarker = markerPos.subtract(rayOrigin);
      const t = Vector3.Dot(toMarker, rayDirection);
      
      if (t < 0) return false;
      
      const closestPoint = rayOrigin.add(rayDirection.scale(t));
      const distance = Vector3.Distance(markerPos, closestPoint);
      
      // Используем актуальный размер с учётом масштаба
      const actualSize = MARKER_CONFIG.defaultSize * this._widget.scale;
      
      return distance < actualSize;
    } catch (error) {
      return false;
    }
  }

  /**
     * Проверить пересечение луча с маркером через сцену
     */
    public intersectsWithScene(scene: Scene, ray: Ray): boolean {
    try {
        // Используем пикер сцены для определения попадания
        const pickResult = scene.pickWithRay(ray, (mesh) => {
        // Проверяем, принадлежит ли меш этому маркеру
        return mesh.parent === this._widget.root;
        });
        
        return pickResult?.hit || false;
    } catch (error) {
        return false;
    }
    }

  /**
   * Получить позицию маркера
   */
  public get position(): Vector3 {
    return this._widget.position;
  }

  /**
   * Получить ID маркера
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Получить тип маркера
   */
  public get type(): MarkerType {
    return this._type;
  }

  /**
   * Получить данные маркера
   */
  public get data(): MarkerData {
    return this._data;
  }

  /**
   * Проверить, выбран ли маркер
   */
  public get isSelected(): boolean {
    return this._isSelected;
  }

  /**
   * Получить корневой узел виджета
   */
  public get root(): any {
    return this._widget.root;
  }

  /**
   * Получить корневой меш маркера
   */
  public get mesh(): Mesh {
    return this._widget.mesh;
  }
}