/**
 * Конфигурация виджета маркера
 */
export const MARKER_WIDGET = {
    // Размеры иконок
    ICON_SIZE_MARKER: 32,
    ICON_SIZE_FLAG: 48,

    // Шрифт
    FONT_SIZE: 18,
    FONT_FAMILY: "Arial, sans-serif",

    // Отступы
    PADDING: 8,
    PADDING_HORIZONTAL: 30,  // icon + горизонтальные отступы
    PADDING_VERTICAL: 18,     // вертикальные отступы для маркера с текстом
    PANEL_PADDING: 4,         // отступы панели
    OUTLINE_PADDING: 3,       // отступы контейнера для outline
    TEXT_PADDING: 8,          // внутренний отступ текстового контейнера
    SHADOW_OFFSET: 2,         // смещение тени

    // Альфа и тени
    BACKGROUND_ALPHA: 0.9,
    SHADOW_ALPHA: 0.6,

    // Пути к иконкам
    ICON_PATH_MARKER: "./icons/marker/target.png",
    ICON_PATH_FLAG: "./icons/marker/circle-flag.png",
    ICON_PATH_GATEWAY_ALLOWED: "./icons/ui/warning.png",
    ICON_PATH_GATEWAY_BLOCKED: "./icons/ui/no-way.png",
    ICON_PATH_WAYPOINT: "./icons/marker/unknown.png",

    // Plane
    PLANE_BASE_SIZE: 1.5,

    // Минимальная высота контейнера
    MIN_HEIGHT: 50,

    // LOD
    OPTIMAL_DISTANCE: 12,
    MIN_SCALE: 0.4,
    MAX_SCALE: 1.0,
    HIDE_TEXT_DISTANCE: 160,
    FADE_START_DISTANCE: 110
};

/**
 * Конфигурация аниматора маркеров
 */
export const MARKER_ANIMATOR = {
    /** Скорость анимации (FPS) */
    ANIMATION_SPEED: 60,
    /** Обычный масштаб */
    NORMAL_SCALE: 1.0,
    /** Масштаб при наведении */
    HOVER_SCALE: 1.2,
    /** Пиковый масштаб при выделении */
    SELECTED_PEAK_SCALE: 1.8,
    /** Конечный масштаб при выделении */
    SELECTED_FINAL_SCALE: 1.5,
    /** Пиковый масштаб при появлении */
    SPAWN_PEAK_SCALE: 1.2,
    /** Цвет обводки при выделении (RGB) */
    SELECTED_OUTLINE_COLOR: { r: 0.3, g: 0.6, b: 1.0 }
} as const;

/**
 * Цвета маркеров по умолчанию
 */
export const MARKER_COLORS = {
    /** Обычный маркер */
    MARKER: { background: { r: 0.2, g: 0.7, b: 0.3, a: 0.9 }, text: { r: 1, g: 1, b: 1, a: 1 } },
    /** Флаг */
    FLAG: { background: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }, text: { r: 0.3, g: 0.5, b: 0.9, a: 1 } },
    /** Gateway */
    GATEWAY: { background: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }, text: { r: 0.95, g: 0.8, b: 0.2, a: 1 } },
    /** Узел навигации */
    WAYPOINT: { background: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }, text: { r: 0.9, g: 0.3, b: 0.3, a: 1 } }
} as const;

/**
 * Иконки маркеров (Material Icons)
 */
export const MARKER_ICONS = {
    /** Обычный маркер */
    MARKER: 'place',
    /** Флаг */
    FLAG: 'flag',
    /** Gateway */
    GATEWAY: 'warning',
    /** Узел навигации */
    WAYPOINT: 'radio_button_unchecked',
    /** Вход */
    ENTRANCE: 'door_front',
    /** Лифт */
    ELEVATOR: 'elevator',
    /** Кафе */
    CAFE: 'restaurant',
    /** Информация */
    INFO: 'info',
    /** Туалет */
    TOILET: 'wc',
    /** Парковка */
    PARKING: 'local_parking'
} as const;

/**
 * Конфигурация рендерера графа связей
 */
export const GRAPH_RENDERER = {
    /** Цвет линии по умолчанию */
    LINE_COLOR: { r: 1, g: 0.5, b: 0 },
    /** Толщина линии */
    LINE_THICKNESS: 0.05,
    /** Показывать стрелки */
    SHOW_ARROWS: true,
    /** Размер стрелок */
    ARROW_SIZE: 0.3,
    /** Цвет активной связи */
    ACTIVE_COLOR: { r: 1, g: 0.8, b: 0 },
    /** Прозрачность неактивных связей */
    INACTIVE_OPACITY: 0.3,
    /** Цвет маршрута */
    ROUTE_COLOR: { r: 0, g: 1, b: 0 },
    /** Скорость анимации маршрута */
    ROUTE_ANIMATION_SPEED: 2
} as const;

export const MARKER = {
    DEFAULT_ICON: '📍',
    DEFAULT_BG_COLOR: { r: 0.2, g: 0.5, b: 0.8, a: 0.9 },
    DEFAULT_TEXT_COLOR: { r: 1, g: 1, b: 1, a: 1 },
    DEFAULT_FLOOR: 1,
    DEFAULT_SIZE: 32
} as const;
