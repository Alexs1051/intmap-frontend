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