import { Vector3 } from "@babylonjs/core";

/**
 * Константы камеры
 */
export const CAMERA = {
    MIN_BETA: 0.1,
    MAX_BETA: Math.PI / 2,
    MIN_RADIUS: 5,
    MAX_RADIUS: 500,
    PANNING_SPEED: 50,
    WHEEL_PRECISION: 10,
    PINCH_PRECISION: 10,

    // Скорости управления камерой
    ROTATION_SPEED: 0.01,      // Скорость вращения камеры (ПКМ)
    PAN_SPEED: 0.005,          // Базовая скорость панорамирования (СКМ)
    PAN_SPEED_MULTIPLIER: 8,   // Множитель скорости панорамирования
    ZOOM_SPEED: 1.5,           // Скорость приближения/отдаления

    // Free Flight настройки
    FREE_FLIGHT: {
        ROTATION_SENSITIVITY: 0.008,
        MOVE_SENSITIVITY: 0.3,
        ZOOM_SENSITIVITY: 0.8,
        DEFAULT_POSITION: new Vector3(0, 20, 40),
        DEFAULT_TARGET: Vector3.Zero(),
        MIN_DISTANCE: 2,
        MAX_DISTANCE: 500
    },

    // Orbit настройки
    ORBIT: {
        ROTATION_SENSITIVITY: 0.008,
        ZOOM_SENSITIVITY: 1.2,
        DEFAULT_ALPHA: -Math.PI / 2,
        DEFAULT_BETA: Math.PI / 3.5,
        DEFAULT_RADIUS: 40,
        MIN_RADIUS: 5,
        MAX_RADIUS: 500,
        MIN_BETA: 0.1,
        MAX_BETA: Math.PI / 2
    },

    TOP_DOWN: {
        ROTATION_SENSITIVITY: 0.006,
        PAN_SENSITIVITY: 0.3,
        ZOOM_SENSITIVITY: 0.8,
        MIN_DISTANCE: 5,
        MAX_DISTANCE: 100
    },

    // Intro animation
    INTRO_ALPHA: Math.PI / 3,
    INTRO_BETA: Math.PI / 3.5,
    INTRO_RADIUS_MULTIPLIER: 3.5,
    INTRO_DURATION: 2.0,

    // Final animation
    FINAL_ALPHA: -Math.PI / 2.5,
    FINAL_BETA: Math.PI / 4,
    FINAL_RADIUS_MIN: 50,
    FINAL_RADIUS_MULTIPLIER: 2.0,

    // Анимация сброса камеры
    RESET_DURATION: 0.8,           // Длительность анимации сброса (сек)
    MODE_SWITCH_DELAY: 100,        // Задержка после переключения режима (мс)

    // Интерполяция
    EASING_POWER: 3,               // Степень для easing-функции

    // Расстояние прорисовки меток
    LABEL_RENDER_DISTANCE: 100,    // Увеличено с 20 до 100

    POSITIONS: {
        INTRO: { alpha: Math.PI / 4, beta: Math.PI / 4, radius: 60 },
        BUILDING: { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 30 },
        FLOOR: { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 15 }
    }
} as const;

/**
 * Конфигурация аниматора камеры
 */
export const CAMERA_ANIMATOR = {
    /** Частота кадров анимации */
    FRAME_RATE: 60,
    /** Базовая длительность анимации (мс) */
    BASE_DURATION: 800,
    /** Фактор ускорения для нижних этажей */
    SPEED_FACTOR: 1.5,
    /** Задержка между этажами (мс) */
    FLOOR_DELAY: 150,
    /** Задержка стен относительно пола (мс) */
    WALL_DELAY: 30,
    /** Задержка между отдельными стенами (мс) */
    WALL_STAGGER: 10,
    /** Высота подъёма элементов (м) */
    START_HEIGHT: 15
} as const;

/**
 * Easing функции для анимаций
 */
export const EASING_FUNCTIONS = {
    LINEAR: (t: number) => t,
    EASE_IN_CUBIC: (t: number) => t * t * t,
    EASE_OUT_CUBIC: (t: number) => 1 - Math.pow(1 - t, 3),
    EASE_IN_OUT_CUBIC: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    SMOOTHSTEP: (t: number) => t * t * (3 - 2 * t),
    EASE_OUT_ELASTIC: (t: number) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

/**
 * Вспомогательная функция для интерполяции между двумя векторами с easing
 */
export function interpolateVector(start: Vector3, end: Vector3, t: number, easing: (t: number) => number = EASING_FUNCTIONS.EASE_OUT_CUBIC): Vector3 {
    const easedT = easing(t);
    return new Vector3(
        start.x + (end.x - start.x) * easedT,
        start.y + (end.y - start.y) * easedT,
        start.z + (end.z - start.z) * easedT
    );
}

/**
 * Вспомогательная функция для интерполяции между двумя числами с easing
 */
export function interpolateValue(start: number, end: number, t: number, easing: (t: number) => number = EASING_FUNCTIONS.EASE_OUT_CUBIC): number {
    const easedT = easing(t);
    return start + (end - start) * easedT;
}