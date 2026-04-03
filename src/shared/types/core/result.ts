import { IAppError } from "./error";

/**
 * Результат операции (успех/ошибка)
 */
export interface IResult<T = any> {
    /** Успешна ли операция */
    success: boolean;
    /** Данные (при успехе) */
    data?: T;
    /** Ошибка (при неудаче) */
    error?: IAppError;
    /** Сообщение */
    message?: string;
}

/**
 * Создать успешный результат
 */
export const successResult = <T>(data: T, message?: string): IResult<T> => ({
    success: true,
    data,
    message
});

/**
 * Создать ошибочный результат
 */
export const errorResult = (error: IAppError): IResult => ({
    success: false,
    error
});