import { NotificationType, UIEventType } from "@shared/types/enum/ui.enum";

/**
 * Информация о пользователе
 */
export interface UserInfo {
    /** Имя пользователя */
    username?: string;
    /** Аутентифицирован ли пользователь */
    isAuthenticated: boolean;
    /** Роль пользователя */
    role?: 'admin' | 'user' | 'guest';
    /** Токен сессии */
    token?: string;
}

/**
 * Результат авторизации
 */
export interface AuthResult {
    /** Успешна ли авторизация */
    success: boolean;
    /** Имя пользователя */
    username?: string;
    /** Роль пользователя */
    role?: string;
    /** Сообщение об ошибке */
    error?: string;
}

/**
 * Опции отображения попапа (уведомления)
 */
export interface PopupOptions {
    /** Текст сообщения */
    message: string;
    /** Тип уведомления */
    type?: NotificationType;
    /** Длительность показа в миллисекундах */
    duration?: number;
    /** Можно ли закрыть крестиком */
    closable?: boolean;
}

/**
 * Опция выбора здания
 */
export interface BuildingOption {
    /** Уникальный идентификатор здания */
    id: string;
    /** Отображаемое название */
    name: string;
    /** URL модели здания */
    modelUrl?: string;
}

/**
 * Событие UI (для передачи между компонентами)
 */
export interface UIEvent {
    /** Тип события */
    type: UIEventType;
    /** Данные события */
    data?: any;
    /** Временная метка */
    timestamp?: number;
}

/**
 * Стили для компонента (условно)
 */
export interface ComponentStyles {
    /** CSS классы */
    className?: string;
    /** Inline стили */
    style?: Partial<CSSStyleDeclaration>;
}

/**
 * Размеры компонента
 */
export interface ComponentSize {
    width: number;
    height: number;
}

/**
 * Позиция компонента на экране
 */
export interface ComponentPosition {
    x: number;
    y: number;
}