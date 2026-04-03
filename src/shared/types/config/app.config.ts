import { IBuildingAnimatorConfig } from "./building.config";
import { ICameraConfig } from "./camera.config";
import { IEngineConfig } from "./engine.config";
import { IGraphRendererConfig } from "./graph.config";
import { ILoggingConfig } from "./logging.config";
import { IMarkersConfig, IMarkerAnimatorConfig, IMarkerWidgetConfig } from "./marker.config";
import { IControlPanelConfig, ISearchBarConfig, IPopupManagerConfig, ILoadingScreenConfig, IConnectionScreenConfig, IBuildingTitleConfig, IAuthPopupConfig } from "./ui.config";

/**
 * Полная конфигурация приложения
 * Содержит все настройки для всех модулей
 */
export interface IAppConfig {
    /** URL API сервера */
    apiUrl: string;
    /** URL модели здания (.glb файл) */
    modelUrl: string;
    /** Режим отладки (включает дополнительные логи) */
    debug: boolean;
    /** Версия приложения */
    version: string;
    /** Окружение, в котором запущено приложение */
    environment: 'development' | 'production' | 'test';
    
    // === Подконфигурации ===
    /** Настройки движка Babylon.js */
    engine: IEngineConfig;
    /** Настройки логирования */
    logging: ILoggingConfig;
    /** Настройки камеры */
    camera: ICameraConfig;
    /** Настройки маркеров */
    markers: IMarkersConfig;
    /** Настройки аниматора маркеров */
    markerAnimator: IMarkerAnimatorConfig;
    /** Настройки виджета маркера */
    markerWidget: IMarkerWidgetConfig;
    /** Настройки аниматора здания */
    buildingAnimator: IBuildingAnimatorConfig;
    /** Настройки рендерера графа связей */
    graphRenderer: IGraphRendererConfig;
    /** Настройки панели управления */
    controlPanel: IControlPanelConfig;
    /** Настройки поиска */
    searchBar: ISearchBarConfig;
    /** Настройки менеджера уведомлений */
    popupManager: IPopupManagerConfig;
    /** Настройки экрана загрузки */
    loadingScreen: ILoadingScreenConfig;
    /** Настройки экрана соединения */
    connectionScreen: IConnectionScreenConfig;
    /** Настройки заголовка здания */
    buildingTitle: IBuildingTitleConfig;
    /** Настройки окна авторизации */
    authPopup: IAuthPopupConfig;
}