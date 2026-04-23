/**
 * Конфигурация панели управления (ControlPanel)
 */
export interface IControlPanelConfig {
    /** Размер кнопки в пикселях */
    buttonSize: number;
    /** Размер иконки внутри кнопки в пикселях */
    buttonIconSize: number;
    /** Длительность анимации в секундах */
    animationDuration: number;
    /** Ориентация панели (auto/landscape/portrait) */
    orientation?: 'auto' | 'landscape' | 'portrait';
}

/**
 * Конфигурация поиска (SearchBar)
 */
export interface ISearchBarConfig {
    /** Максимальное количество результатов в выдаче */
    maxResults: number;
    /** Минимальная длина поискового запроса */
    minQueryLength: number;
    /** Задержка перед выполнением поиска (debounce) в мс */
    debounceDelay: number;
    /** Текст-плейсхолдер в поле ввода */
    placeholder: string;
    /** Показывать счетчик результатов */
    showCounter?: boolean;
}

/**
 * Конфигурация менеджера уведомлений (PopupManager)
 */
export interface IPopupManagerConfig {
    /** Максимальное количество одновременно открытых уведомлений */
    maxPopups: number;
    /** Длительность показа уведомления по умолчанию (мс) */
    defaultDuration: number;
    /** Длительность анимации появления/исчезновения (мс) */
    animationDuration: number;
    /** Показывать прогресс-бар */
    showProgressBar?: boolean;
}

/**
 * Конфигурация экрана загрузки (LoadingScreen)
 */
export interface ILoadingScreenConfig {
    /** Заголовок экрана загрузки */
    title: string;
    /** Длительность анимации в миллисекундах */
    animationDuration: number;
    /** Показывать процент загрузки */
    showPercentage?: boolean;
}

/**
 * Конфигурация экрана соединения (ConnectionScreen)
 */
export interface IConnectionScreenConfig {
    /** Текст кнопки повторной попытки */
    retryButtonText: string;
    /** Сообщение по умолчанию при потере соединения */
    defaultMessage: string;
    /** Сообщение об ошибке соединения */
    errorMessage: string;
    /** Количество попыток переподключения */
    maxRetries?: number;
}

/**
 * Конфигурация заголовка здания (BuildingTitle)
 */
export interface IBuildingTitleConfig {
    /** Заголовок по умолчанию (если не выбрано здание) */
    defaultTitle: string;
    /** Показывать иконку здания */
    showIcon?: boolean;
}

/**
 * Конфигурация окна авторизации (AuthPopup)
 */
export interface IAuthPopupConfig {
    /** Заголовок окна */
    title: string;
    /** Метка поля логина */
    loginLabel: string;
    /** Метка поля пароля */
    passwordLabel: string;
    /** Плейсхолдер поля логина */
    loginPlaceholder: string;
    /** Плейсхолдер поля пароля */
    passwordPlaceholder: string;
    /** Текст кнопки отмены */
    cancelButtonText: string;
    /** Текст кнопки отправки */
    submitButtonText: string;
    /** Текст подтверждения выхода */
    logoutConfirmText: string;
    /** Текст кнопки выхода */
    logoutButtonText: string;
    /** Разрешить демо-режим */
    allowDemo?: boolean;
}
