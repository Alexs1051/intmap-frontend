/**
 * Структура ошибки для передачи между компонентами
 */
export interface IAppError {
    /** Код ошибки */
    code: string;
    /** Сообщение об ошибке */
    message: string;
    /** HTTP статус код */
    statusCode?: number;
    /** Дополнительные данные */
    data?: any;
    /** Временная метка */
    timestamp: Date;
}

/**
 * Валидационная ошибка
 */
export interface IValidationError extends IAppError {
    /** Поле, в котором произошла ошибка */
    field?: string;
    /** Ожидаемое значение */
    expected?: any;
    /** Фактическое значение */
    actual?: any;
}

/**
 * Сетевая ошибка
 */
export interface INetworkError extends IAppError {
    /** URL запроса */
    url?: string;
    /** Метод запроса */
    method?: string;
    /** Статус ответа */
    status?: number;
}