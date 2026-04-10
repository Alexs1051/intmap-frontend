import { Scene } from "@babylonjs/core";
import { Marker } from "../../features/markers/Marker";
import {
    UIEvent, UserInfo, NotificationType, SearchResult,
    PopupOptions, BuildingOption, AuthResult
} from "../types";
import { ICameraManager, IBuildingManager, IMarkerManager } from "./index";

/**
 * Интерфейс UI менеджера
 * Главный координатор всех UI компонентов
 */
export interface IUIManager {
    /** Инициализация UI менеджера */
    initialize(scene: Scene, dependencies: UIManagerDependencies): void;

    /** Экран загрузки */
    showLoading(status: string): void;
    updateLoadingProgress(progress: number, status?: string): void;
    hideLoading(): void;

    /** Уведомления */
    showNotification(message: string, type: NotificationType, duration?: number): void;
    showInfo(message: string, duration?: number): void;
    showSuccess(message: string, duration?: number): void;
    showError(message: string, duration?: number): void;
    showWarning(message: string, duration?: number): void;

    /** Экран соединения */
    showConnection(reason?: string): void;
    showConnectionError(reason?: string): void;
    hideConnection(): void;
    setRetryCallback(callback: () => void): void;

    /** Поиск */
    toggleSearch(): void;

    /** FPS счётчик */
    updateFPS(): void;
    toggleFPS(show?: boolean): void;

    /** Тема оформления */
    setTheme(theme: 'light' | 'dark'): void;
    loadTheme(): void;

    /** Уничтожить */
    dispose(): void;
}

/**
 * Зависимости для UI менеджера
 */
export interface UIManagerDependencies {
    cameraManager: ICameraManager;
    buildingManager: IBuildingManager;
    markerManager: IMarkerManager;
    scene: Scene;
}

/**
 * Интерфейс панели управления
 */
export interface IControlPanel {
    /** Обновить состояние кнопки */
    updateButtonState(buttonId: string, isActive: boolean): void;
    /** Получить состояние кнопки */
    getButtonState(buttonId: string): boolean;
    /** Установить состояние авторизации */
    setAuthState(userInfo: UserInfo): void;
    /** Обновить кнопки этажей */
    updateFloorButtons(currentFloor: number, maxFloor: number): void;
    /** Установить видимость графа */
    setGraphVisible(visible: boolean): void;
    /** Установить тему (тёмная/светлая) */
    setDarkTheme(isDark: boolean): void;
    /** Добавить слушатель событий */
    addEventListener(listener: (event: UIEvent) => void): void;
    /** Удалить слушатель */
    removeEventListener(listener: (event: UIEvent) => void): void;
    /** Уничтожить */
    dispose(): void;
}

/**
 * Интерфейс поиска
 */
export interface ISearchBar {
    /** Установить менеджер маркеров */
    setMarkerManager(manager: IMarkerManager): void;
    /** Обновить список маркеров */
    refreshMarkers(): void;
    /** Показать поиск */
    show(): void;
    /** Скрыть поиск */
    hide(): void;
    /** Переключить поиск */
    toggle(): void;
    /** Установить колбэк поиска */
    setSearchCallback(callback: (query: string) => void): void;
    /** Установить колбэк выбора результата */
    setResultClickCallback(callback: (result: SearchResult) => void): void;
    /** Установить колбэк закрытия */
    setCloseCallback(callback: () => void): void;
    /** Видим ли поиск */
    readonly isVisible: boolean;
    /** Уничтожить */
    dispose(): void;
}

/**
 * Интерфейс менеджера уведомлений
 */
export interface IPopupManager {
    /** Показать уведомление */
    show(options: PopupOptions): void;
    /** Информационное уведомление */
    info(message: string, duration?: number): void;
    /** Уведомление об успехе */
    success(message: string, duration?: number): void;
    /** Уведомление об ошибке */
    error(message: string, duration?: number): void;
    /** Предупреждение */
    warning(message: string, duration?: number): void;
    /** Скрыть все уведомления */
    hideAll(): void;
    /** Установить максимальное количество */
    setMaxPopups(max: number): void;
    /** Установить длительность по умолчанию */
    setDefaultDuration(duration: number): void;
    /** Уничтожить */
    dispose(): void;
}

/**
 * Интерфейс панели деталей маркера
 */
export interface IMarkerDetailsPanel {
    /** Показать панель для маркера */
    show(marker: Marker): void;
    /** Скрыть панель */
    hide(): void;
    /** Обновить состояние кнопки "Отсюда" */
    updateFromState(active: boolean): void;
    /** Обновить состояние кнопки "Сюда" */
    updateToState(active: boolean): void;
    updateRouteState(fromMarkerId: string | null, toMarkerId: string | null): void;
    /** Установить колбэк закрытия */
    setCloseCallback(callback: () => void): void;
    /** Установить колбэк фокуса */
    setFocusCallback(callback: (marker: Marker) => void): void;
    /** Установить колбэки маршрута */
    setRouteCallbacks(
        onFromToggle: (marker: Marker) => void,
        onToToggle: (marker: Marker) => void
    ): void;
    /** Видима ли панель */
    readonly isVisible: boolean;
    /** Текущий маркер */
    readonly currentMarker: Marker | null;
    /** Уничтожить */
    dispose(): void;
}

/**
 * Интерфейс экрана соединения
 */
export interface IConnectionScreen {
    /** Показать с сообщением */
    show(reason?: string): void;
    /** Показать ошибку */
    showError(reason?: string): void;
    /** Скрыть */
    hide(): void;
    /** Установить колбэк повторной попытки */
    setRetryCallback(callback: () => void): void;
    /** Видим ли */
    readonly isVisible: boolean;
    /** Уничтожить */
    dispose(): void;
}

/**
 * Интерфейс счётчика FPS
 */
export interface IFPSCounter {
    /** Обновить счётчик */
    update(): void;
    /** Уничтожить */
    dispose(): void;
    setVisible?(visible: boolean): void;
}

/**
 * Интерфейс заголовка здания
 */
export interface IBuildingTitle {
    /** Установить список зданий */
    setBuildings(options: BuildingOption[], selectedId?: string): void;
    /** Добавить здание */
    addBuilding(option: BuildingOption, select?: boolean): void;
    /** Установить колбэк смены здания */
    setOnBuildingChange(callback: (buildingId: string) => void): void;
    /** Получить выбранное здание */
    readonly selectedBuilding: BuildingOption | null;
    /** Уничтожить */
    dispose(): void;
}

/**
 * Интерфейс окна авторизации
 */
export interface IAuthPopup {
    /** Показать окно авторизации */
    show(): void;
    /** Показать подтверждение выхода */
    showLogoutConfirmation(): void;
    /** Скрыть окно */
    hide(): void;
    /** Установить колбэк авторизации */
    setAuthCallback(callback: (result: AuthResult) => void): void;
    /** Установить колбэк закрытия */
    setCloseCallback(callback: () => void): void;
    /** Видимо ли окно */
    readonly isVisible: boolean;
    /** Уничтожить */
    dispose(): void;
}