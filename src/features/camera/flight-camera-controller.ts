import { ArcRotateCamera, Vector3 } from "@babylonjs/core";

/**
 * Контроллер свободного полёта камеры
 * Позволяет перемещать камеру без ограничений pivot точки
 * Используется вместе с Orbit режимом в CameraInputHandler
 */
export class FlightCameraController {
  // Текущее состояние камеры
  private position: Vector3 = Vector3.Zero();
  private target: Vector3 = Vector3.Zero();
  private alpha: number = 0;
  private beta: number = Math.PI / 2;
  private radius: number = 10;

  // Скорости управления
  private readonly MOVE_SPEED = 0.5;
  private readonly ROTATION_SENSITIVITY = 0.008;
  private readonly ZOOM_SPEED = 2.0;
  private readonly MIN_RADIUS = 1;
  private readonly MAX_RADIUS = 200;

  constructor() {
  }

  /**
   * Инициализировать контроллер из текущей камеры
   */
  public initFromCamera(camera: ArcRotateCamera): void {
    this.position = camera.position.clone();
    this.target = camera.target.clone();
    this.alpha = camera.alpha;
    this.beta = camera.beta;
    this.radius = camera.radius;
  }

  /**
   * Применить вращение камеры
   */
  public rotate(deltaX: number, deltaY: number): void {
    this.alpha -= deltaX * this.ROTATION_SENSITIVITY;
    this.beta -= deltaY * this.ROTATION_SENSITIVITY;

    // Ограничиваем beta чтобы не переворачиваться
    this.beta = Math.max(0.01, Math.min(Math.PI - 0.01, this.beta));

    // Пересчитываем позицию из углов
    this.recalculatePosition();
  }

  /**
   * Применить панорамирование (перемещение target)
   */
  public pan(deltaX: number, deltaY: number): void {
    // Вычисляем векторы "вправо" и "вверх" относительно камеры
    const right = this.getRightVector();
    const up = this.getUpVector();

    // Перемещаем target
    this.target = this.target
      .subtract(right.scale(deltaX * this.MOVE_SPEED))
      .add(up.scale(deltaY * this.MOVE_SPEED));

    // Пересчитываем позицию
    this.recalculatePosition();
  }

  /**
   * Применить зум
   */
  public zoom(delta: number): void {
    this.radius -= delta * this.ZOOM_SPEED;
    this.radius = Math.max(this.MIN_RADIUS, Math.min(this.MAX_RADIUS, this.radius));
    this.recalculatePosition();
  }

  /**
   * Пересчитать позицию камеры из углов и target
   */
  private recalculatePosition(): void {
    // Сферические -> Декартовы координаты
    this.position.x = this.target.x + this.radius * Math.sin(this.beta) * Math.cos(this.alpha);
    this.position.y = this.target.y + this.radius * Math.cos(this.beta);
    this.position.z = this.target.z + this.radius * Math.sin(this.beta) * Math.sin(this.alpha);
  }

  /**
   * Получить вектор "вправо" относительно текущего направления камеры
   */
  private getRightVector(): Vector3 {
    const forward = this.target.subtract(this.position).normalize();
    const worldUp = new Vector3(0, 1, 0);
    return Vector3.Cross(forward, worldUp).normalize();
  }

  /**
   * Получить вектор "вверх" относительно текущего направления камеры
   */
  private getUpVector(): Vector3 {
    const forward = this.target.subtract(this.position).normalize();
    const right = this.getRightVector();
    return Vector3.Cross(right, forward).normalize();
  }

  /**
   * Применить состояние к Babylon.js камере
   */
  public applyToCamera(camera: ArcRotateCamera): void {
    camera.alpha = this.alpha;
    camera.beta = this.beta;
    camera.radius = this.radius;
    camera.target = this.target.clone();
  }

  /**
   * Геттеры
   */
  public getPosition(): Vector3 { return this.position.clone(); }
  public getTarget(): Vector3 { return this.target.clone(); }
  public getAlpha(): number { return this.alpha; }
  public getBeta(): number { return this.beta; }
  public getRadius(): number { return this.radius; }

  /**
   * Установить target (для focusOnPoint)
   */
  public setTarget(target: Vector3): void {
    this.target = target.clone();
    this.recalculatePosition();
  }

  /**
   * Мгновенно перейти к точке с определённым расстоянием
   */
  public setView(target: Vector3, distance: number, alpha?: number, beta?: number): void {
    this.target = target.clone();
    this.radius = distance;
    if (alpha !== undefined) this.alpha = alpha;
    if (beta !== undefined) this.beta = beta;
    this.recalculatePosition();
  }
}
