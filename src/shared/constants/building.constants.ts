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
    TRANSPARENT_ALPHA: 0.3,
    /** Прозрачность по умолчанию */
    DEFAULT_TRANSPARENT: false,
    /** Режим рентгена по умолчанию */
    XRAY_ENABLED: false,
    /** Rendering group для стен (меньше = рисуется раньше) */
    WALL_RENDERING_GROUP: 0,
    /** Rendering group для меток (больше = рисуется поверх стен) */
    MARKER_RENDERING_GROUP: 1,
    /** Отключить запись в depth buffer для прозрачных стен */
    DISABLE_DEPTH_WRITE: true,
    /** Использовать depth pre-pass для сохранения геометрии */
    USE_DEPTH_PRE_PASS: true,
    /** Множитель цвета для прозрачных стен (уменьшает насыщенность) */
    TRANSPARENT_COLOR_SCALE: 0.7
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
 * Конфигурация раскрытия этажей
 */
export const FLOOR_EXPAND_CONFIG = {
    /** Смещение между этажами при раскрытии (в метрах) */
    FLOOR_OFFSET: 8.0,
    /** Длительность анимации раскрытия/сворачивания (мс) */
    ANIMATION_DURATION: 800,
    /** Частота кадров анимации */
    FRAME_RATE: 60
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