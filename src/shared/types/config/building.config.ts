/**
 * Конфигурация аниматора здания
 * Управляет анимацией строительства (падения элементов)
 */
export interface IBuildingAnimatorConfig {
    /** Высота подъёма элементов в метрах (с какой высоты падают) */
    startHeight: number;
    /** Базовая длительность анимации в миллисекундах */
    baseDuration: number;
    /** Задержка между этажами в миллисекундах */
    floorDelay: number;
    /** Задержка стен относительно пола в миллисекундах */
    wallDelay: number;
    /** Задержка между отдельными стенами в миллисекундах */
    wallStagger: number;
    /** Фактор ускорения для нижних этажей */
    speedFactor: number;
    /** Частота кадров анимации */
    frameRate: number;
}

/**
 * Конфигурация здания (общие настройки)
 */
export interface IBuildingConfig {
    /** Высота этажа в метрах */
    floorHeight: number;
    /** Прозрачность стен по умолчанию */
    defaultWallTransparency: boolean;
    /** Коэффициент прозрачности стен */
    wallTransparencyAlpha: number;
}