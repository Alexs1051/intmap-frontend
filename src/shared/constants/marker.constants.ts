/**
 * Конфигурация виджета маркера
 */
export const MARKER_WIDGET = {
    /** Размер иконки в пикселях */
    ICON_SIZE: 32,
    /** Размер шрифта иконки */
    ICON_FONT_SIZE: 24,
    /** Отступы внутри виджета */
    PADDING: 8,
    /** Размер шрифта текста */
    FONT_SIZE: 14,
    /** Масштаб текстуры */
    TEXTURE_SCALE: 100,
    /** Прозрачность фона */
    BACKGROUND_ALPHA: 0.9,
    /** Масштаб обводки */
    OUTLINE_SCALE: 1.2,
    /** Множители размера для разных типов маркеров */
    SIZE_MULTIPLIERS: {
        marker: 1.0,
        flag: 1.2,
        waypoint: 0.8
    }
} as const;

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
    MARKER: { background: { r: 0.3, g: 0.5, b: 0.9, a: 0.9 }, text: { r: 1, g: 1, b: 1, a: 1 } },
    /** Флаг */
    FLAG: { background: { r: 0.9, g: 0.3, b: 0.3, a: 0.9 }, text: { r: 1, g: 1, b: 1, a: 1 } },
    /** Узел навигации */
    WAYPOINT: { background: { r: 0.2, g: 0.7, b: 0.3, a: 0.9 }, text: { r: 1, g: 1, b: 1, a: 1 } }
} as const;

/**
 * Иконки маркеров (Material Icons)
 */
export const MARKER_ICONS = {
    /** Обычный маркер */
    MARKER: 'place',
    /** Флаг */
    FLAG: 'flag',
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