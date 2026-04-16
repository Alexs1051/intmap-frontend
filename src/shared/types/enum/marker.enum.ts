/**
 * Типы маркеров на карте
 */
export enum MarkerType {
    /** Обычная метка (POI - точка интереса) */
    MARKER = 'marker',
    /** Флаг (особо важная точка) */
    FLAG = 'flag',
    /** Контрольная точка доступа */
    GATEWAY = 'gateway',
    /** Узел навигационной сети (waypoint) */
    WAYPOINT = 'waypoint'
}

/**
 * Направление связи между маркерами
 */
export type ConnectionDirection = 'one-way' | 'two-way';

/**
 * Типы иконок маркеров (Material Icons)
 */
export enum MarkerIcon {
    /** Иконка метки по умолчанию */
    MARKER = 'place',
    /** Иконка флага */
    FLAG = 'flag',
    /** Иконка gateway */
    GATEWAY = 'warning',
    /** Иконка узла навигации */
    WAYPOINT = 'radio_button_unchecked',
    /** Иконка входа */
    ENTRANCE = 'door_front',
    /** Иконка лифта */
    ELEVATOR = 'elevator',
    /** Иконка кафе/ресторана */
    CAFE = 'restaurant',
    /** Иконка информации */
    INFO = 'info',
    /** Иконка туалета */
    TOILET = 'wc',
    /** Иконка парковки */
    PARKING = 'local_parking'
}

/**
 * Цвета маркеров по умолчанию (для разных типов)
 */
export enum MarkerDefaultColor {
    /** Цвет обычной метки */
    MARKER = '#4a90d9',
    /** Цвет флага */
    FLAG = '#e74c3c',
    /** Цвет gateway */
    GATEWAY = '#f1c40f',
    /** Цвет узла навигации */
    WAYPOINT = '#2ecc71'
}
