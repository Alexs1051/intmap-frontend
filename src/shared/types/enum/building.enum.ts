/**
 * Типы элементов здания
 */
export type ElementType = 
    | 'floor'      // Пол / этаж
    | 'wall'       // Стена
    | 'window'     // Окно
    | 'door'       // Дверь
    | 'stair'      // Лестница
    | 'other';     // Прочие элементы

/**
 * Типы материалов для строительных элементов
 */
export enum MaterialType {
    /** Стандартный материал */
    STANDARD = 'standard',
    /** PBR материал (физически корректный) */
    PBR = 'pbr',
    /** Прозрачный материал */
    TRANSPARENT = 'transparent'
}

/**
 * Режим отображения здания
 */
export enum BuildingViewMode {
    /** Показать все этажи одновременно */
    ALL = 'all',
    /** Показать только один этаж */
    SINGLE = 'single'
}

/**
 * Режим анимации строительства
 */
export enum ConstructionAnimationMode {
    /** Анимация отключена */
    OFF = 'off',
    /** Анимация падения элементов сверху вниз */
    FALL = 'fall',
    /** Анимация появления снизу вверх */
    GROW = 'grow'
}