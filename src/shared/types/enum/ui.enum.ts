/**
 * Типы событий UI
 */
export enum UIEventType {
    // Поиск
    SEARCH_TOGGLE = 'search:toggle',
    
    // Авторизация
    AUTH_TOGGLE = 'auth:toggle',
    
    // Камера
    CAMERA_MODE_TOGGLE = 'camera:mode:toggle',
    RESET_CAMERA = 'camera:reset',
    
    // Граф связей
    TOGGLE_GRAPH = 'graph:toggle',
    
    // Тема оформления
    TOGGLE_THEME = 'theme:toggle',
    
    // Здание
    TOGGLE_WALL_TRANSPARENCY = 'wall:transparency:toggle',
    TOGGLE_VIEW_MODE = 'view:mode:toggle',
    NEXT_FLOOR = 'floor:next',
    PREV_FLOOR = 'floor:prev',
    FLOOR_SELECT = 'floor:select'
}

/**
 * Типы уведомлений
 */
export type NotificationType = 'info' | 'success' | 'error' | 'warning';

/**
 * Темы оформления интерфейса
 */
export type ThemeType = 'light' | 'dark';

/**
 * Ориентация экрана (для адаптивного UI)
 */
export type ScreenOrientation = 'portrait' | 'landscape';

/**
 * Размер экрана (для адаптивных стилей)
 */
export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

/**
 * Статусы загрузки
 */
export enum LoadingStatus {
    /** Не начата */
    IDLE = 'idle',
    /** В процессе */
    LOADING = 'loading',
    /** Успешно завершена */
    SUCCESS = 'success',
    /** Ошибка */
    ERROR = 'error'
}

/**
 * Типы действий в попапах
 */
export enum PopupAction {
    /** Только просмотр */
    VIEW = 'view',
    /** Подтверждение */
    CONFIRM = 'confirm',
    /** Отмена */
    CANCEL = 'cancel',
    /** Повторить */
    RETRY = 'retry'
}