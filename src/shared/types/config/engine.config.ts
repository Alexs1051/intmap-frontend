/**
 * Конфигурация движка Babylon.js
 * Управляет созданием и настройкой 3D движка
 */
export interface IEngineConfig {
    /** ID canvas элемента в DOM (по умолчанию 'gameCanvas') */
    canvasId?: string;
    /** Включить антиалиасинг (сглаживание) */
    antialias?: boolean;
    /** Адаптировать под DPI устройства (Retina и т.д.) */
    adaptToDeviceRatio?: boolean;
    /** Отключить WebGL2 (использовать WebGL1) */
    disableWebGL2?: boolean;
    /** Не обрабатывать потерю контекста WebGL */
    doNotHandleContextLost?: boolean;
    /** Прозрачный фон сцены */
    transparent?: boolean;
    /** Максимальное количество источников света */
    maxLights?: number;
}