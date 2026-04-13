/**
 * Базовое событие для EventBus
 * Используется для передачи сообщений между компонентами
 */
export interface IEvent<T = any> {
    /** Тип события (из EventType) */
    type: string;
    /** Данные события */
    data: T;
    /** Временная метка в миллисекундах */
    timestamp: number;
    /** Источник события (опционально) */
    source?: string;
}

/**
 * Обработчик события
 */
export type EventHandler<T = any> = (event: IEvent<T>) => void;