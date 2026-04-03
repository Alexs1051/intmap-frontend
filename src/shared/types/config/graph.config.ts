/**
 * Конфигурация рендерера графа связей
 * Управляет отображением линий между маркерами
 */
export interface IGraphRendererConfig {
    /** Цвет линии связи (RGB от 0 до 1) */
    lineColor: { r: number; g: number; b: number };
    /** Толщина линии в метрах */
    lineThickness: number;
    /** Показывать стрелки направления связи */
    showArrows: boolean;
    /** Размер стрелок в метрах */
    arrowSize: number;
    /** Цвет активной связи (при наведении) */
    activeColor: { r: number; g: number; b: number };
    /** Прозрачность неактивных связей (0-1) */
    inactiveOpacity: number;
    /** Цвет построенного маршрута */
    routeColor: { r: number; g: number; b: number };
    /** Скорость анимации маршрута */
    routeAnimationSpeed: number;
    /** Включить анимацию маршрута */
    routeAnimationEnabled?: boolean;
}