/**
 * Конфигурация компонента сцены
 * Используется для динамической регистрации компонентов в SceneManager
 */
export interface ISceneComponentRegistration {
    /** Уникальное имя компонента */
    name: string;
    /** DI токен типа компонента */
    type: symbol;
    /** Нужно ли установить сцену через setScene() */
    setScene: boolean;
    /** Является ли загружаемым компонентом (реализует ILoadableComponent) */
    isLoadable: boolean;
}

/**
 * Менеджер зависимостей для инициализации UI
 * Содержит ссылки на все необходимые менеджеры
 */
export interface IManagerDependencies {
    /** Менеджер камеры */
    cameraManager: any;
    /** Менеджер здания */
    buildingManager: any;
    /** Менеджер маркеров */
    markerManager: any;
    /** Сцена */
    scene: any;
}

/**
 * Состояние маршрута
 * Хранит информацию о начальной и конечной точках
 */
export interface IRouteState {
    /** ID начального маркера */
    fromMarkerId: string | null;
    /** ID конечного маркера */
    toMarkerId: string | null;
    /** Активен ли маршрут */
    isActive: boolean;
}

/**
 * Результат поиска пути
 */
export interface IRouteResult {
    /** Успешно ли найден путь */
    success: boolean;
    /** Массив ID маркеров пути */
    path: string[];
    /** Общее расстояние в метрах */
    totalDistance?: number;
    /** Количество точек пути */
    pointCount: number;
    /** Сообщение об ошибке */
    error?: string;
}
