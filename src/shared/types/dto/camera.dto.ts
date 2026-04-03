import { Vector3 } from "@babylonjs/core";
import { CameraMode } from "../enum/camera.enum";

/**
 * Трансформация камеры (положение в пространстве)
 */
export interface CameraTransform {
    /** Угол поворота вокруг вертикальной оси (альфа) в радианах */
    alpha: number;
    /** Угол поворота вокруг горизонтальной оси (бета) в радианах */
    beta: number;
    /** Расстояние от камеры до цели (радиус) */
    radius: number;
    /** Точка, на которую смотрит камера */
    target: Vector3;
    /** Позиция камеры (для свободного режима) */
    position?: Vector3;
    /** Направление камеры (для свободного режима) */
    targetDirection?: Vector3;
}

/**
 * Состояние камеры (для сохранения/восстановления)
 */
export interface CameraState {
    /** Режим камеры */
    mode: CameraMode;
    /** Трансформация камеры */
    transform: CameraTransform;
    /** Скорость движения камеры */
    velocity: Vector3;
}

/**
 * Ограничения камеры
 */
export interface CameraLimits {
    /** Минимальный радиус зума */
    minRadius: number;
    /** Максимальный радиус зума */
    maxRadius: number;
    /** Минимальный угол наклона (бета) */
    minBeta: number;
    /** Максимальный угол наклона (бета) */
    maxBeta: number;
    /** Скорость движения в режиме свободного полёта */
    freeFlightSpeed: number;
    /** Ускорение в режиме свободного полёта (при Shift) */
    freeFlightBoost: number;
}

/**
 * Чувствительность управления камерой
 */
export interface CameraSensitivity {
    /** Чувствительность вращения */
    rotation: number;
    /** Чувствительность зума */
    zoom: number;
    /** Чувствительность панорамирования */
    pan: number;
    /** Чувствительность в режиме свободного полёта */
    freeFlight: number;
}

/**
 * Настройки анимации камеры
 */
export interface CameraAnimationConfig {
    /** Длительность анимации в секундах */
    duration: number;
    /** Тип easing-функции */
    easing: string;
}