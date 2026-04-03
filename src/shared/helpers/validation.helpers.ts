/**
 * Проверяет, является ли строка валидным email
 * @param email - email для проверки
 * @returns true если валидный
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
};

/**
 * Проверяет, является ли строка валидным URL
 * @param url - URL для проверки
 * @returns true если валидный
 */
export const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Проверяет, является ли значение числом
 * @param value - значение для проверки
 * @returns true если число
 */
export const isNumber = (value: any): boolean => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * Проверяет, является ли значение целым числом
 * @param value - значение для проверки
 * @returns true если целое число
 */
export const isInteger = (value: any): boolean => {
    return isNumber(value) && Math.floor(value) === value;
};

/**
 * Проверяет, пуста ли строка
 * @param str - строка для проверки
 * @returns true если пуста
 */
export const isEmptyString = (str: string): boolean => {
    return !str || str.trim().length === 0;
};

/**
 * Проверяет, является ли значение объектом
 * @param value - значение для проверки
 * @returns true если объект
 */
export const isObject = (value: any): boolean => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

/**
 * Проверяет, находится ли число в допустимых пределах
 * @param value - число
 * @param min - минимум
 * @param max - максимум
 * @returns true если в пределах
 */
export const isValidRange = (value: number, min: number, max: number): boolean => {
    return isNumber(value) && value >= min && value <= max;
};