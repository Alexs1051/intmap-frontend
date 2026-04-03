/**
 * Конфигурация маркеров
 * Управляет отображением и поведением маркеров
 */
export interface IMarkersConfig {
    /** Размер иконки маркера по умолчанию (пиксели) */
    defaultIconSize: number;
    /** Максимальная дистанция видимости маркера (метры) */
    maxDistance: number;
    /** Дистанция, на которой маркер начинает уменьшаться */
    fadeDistance?: number;
    /** Включить билборд (маркер всегда повёрнут к камере) */
    billboardEnabled?: boolean;
}

/**
 * Конфигурация аниматора маркеров
 * Управляет анимациями появления, наведения и выделения
 */
export interface IMarkerAnimatorConfig {
    /** Скорость анимации (FPS) */
    animationSpeed: number;
    /** Обычный масштаб маркера */
    normalScale: number;
    /** Масштаб при наведении курсора */
    hoverScale: number;
    /** Пиковый масштаб при выделении (максимальный) */
    selectedPeakScale: number;
    /** Конечный масштаб при выделении */
    selectedFinalScale: number;
    /** Пиковый масштаб при появлении */
    spawnPeakScale: number;
    /** Цвет обводки при выделении */
    selectedOutlineColor?: { r: number; g: number; b: number };
}

/**
 * Конфигурация виджета маркера
 * Управляет внешним видом UI элемента маркера
 */
export interface IMarkerWidgetConfig {
    /** Размер иконки в пикселях */
    iconSize: number;
    /** Размер шрифта иконки */
    iconFontSize: number;
    /** Отступы внутри виджета (пиксели) */
    padding: number;
    /** Размер шрифта текста */
    fontSize: number;
    /** Масштаб текстуры (для рендеринга) */
    textureScale: number;
    /** Прозрачность фона (0 - прозрачный, 1 - непрозрачный) */
    backgroundAlpha: number;
    /** Масштаб обводки относительно размера виджета */
    outlineScale: number;
}