/**
 * Конфигурация парсера здания
 */
export const BUILDING_PARSER = {
    /** Префикс ноды этажа */
    FLOOR_PREFIX: "Floor_",
    /** Префикс стены */
    WALL_PREFIX: "Wall_",
    /** Префикс окна */
    WINDOW_PREFIX: "Window_",
    /** Префикс двери */
    DOOR_PREFIX: "Door_",
    /** Префикс лестницы */
    STAIR_PREFIX: "Stair_"
} as const;

/**
 * Конфигурация анимации строительства
 */
export const BUILDING_ANIMATION = {
    /** Частота кадров анимации */
    FRAME_RATE: 60,
    /** Базовая длительность анимации (мс) */
    BASE_DURATION: 800,
    /** Фактор ускорения */
    SPEED_FACTOR: 1.5,
    /** Задержка между этажами (мс) */
    FLOOR_DELAY: 200,
    /** Задержка стен относительно пола (мс) */
    WALL_DELAY: 50,
    /** Задержка между стенами (мс) */
    WALL_STAGGER: 10,
    /** Высота подъёма элементов (м) */
    START_HEIGHT_OFFSET: 10
} as const;

/**
 * Конфигурация стен
 */
export const WALL_CONFIG = {
    /** Прозрачность стен (0-1) */
    TRANSPARENT_ALPHA: 0.5,
    /** Прозрачность по умолчанию */
    DEFAULT_TRANSPARENT: false,
    /** Режим рентгена по умолчанию */
    XRAY_ENABLED: false
} as const;

/**
 * Конфигурация этажей
 */
export const FLOOR_CONFIG = {
    /** Номер этажа по умолчанию */
    DEFAULT_FLOOR: 1,
    /** Высота этажа в метрах */
    FLOOR_HEIGHT: 3.0,
    /** Порог для определения этажа */
    FLOOR_THRESHOLD: 0.5
} as const;

/**
 * Конфигурация здания по умолчанию
 */
export const BUILDING_DEFAULTS = {
    /** Размеры по умолчанию */
    DIMENSIONS: {
        height: 30,
        width: 30,
        depth: 30
    },
    /** Центр по умолчанию */
    CENTER: { x: 0, y: 0, z: 0 }
} as const;