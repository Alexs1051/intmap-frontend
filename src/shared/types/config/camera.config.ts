/**
 * Конфигурация камеры
 * Управляет поведением и ограничениями камеры
 */
export interface ICameraConfig {
    /** Позиция камеры по умолчанию */
    defaultPosition: { x: number; y: number; z: number };
    /** Точка фокуса по умолчанию */
    defaultTarget: { x: number; y: number; z: number };
    /** Скорость зума (чувствительность колесика мыши) */
    zoomSpeed: number;
    /** Скорость вращения камеры */
    rotationSpeed: number;
    /** Скорость панорамирования */
    panSpeed?: number;
    /** Минимальная дистанция до цели */
    minDistance?: number;
    /** Максимальная дистанция до цели */
    maxDistance?: number;
    /** Минимальный угол наклона (в радианах) */
    minBeta?: number;
    /** Максимальный угол наклона (в радианах) */
    maxBeta?: number;
}