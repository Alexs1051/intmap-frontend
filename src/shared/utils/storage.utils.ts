/**
 * Сохраняет данные в localStorage
 * @param key - ключ
 * @param data - данные
 */
export const saveToLocalStorage = <T>(key: string, data: T): void => {
    try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
    } catch (error) {
        console.error(`Failed to save to localStorage: ${key}`, error);
    }
};

/**
 * Загружает данные из localStorage
 * @param key - ключ
 * @param defaultValue - значение по умолчанию
 * @returns загруженные данные или значение по умолчанию
 */
export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const serialized = localStorage.getItem(key);
        if (serialized === null) return defaultValue;
        return JSON.parse(serialized) as T;
    } catch (error) {
        console.error(`Failed to load from localStorage: ${key}`, error);
        return defaultValue;
    }
};

/**
 * Удаляет данные из localStorage
 * @param key - ключ
 */
export const removeFromLocalStorage = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Failed to remove from localStorage: ${key}`, error);
    }
};

/**
 * Сохраняет данные в sessionStorage
 * @param key - ключ
 * @param data - данные
 */
export const saveToSessionStorage = <T>(key: string, data: T): void => {
    try {
        const serialized = JSON.stringify(data);
        sessionStorage.setItem(key, serialized);
    } catch (error) {
        console.error(`Failed to save to sessionStorage: ${key}`, error);
    }
};

/**
 * Загружает данные из sessionStorage
 * @param key - ключ
 * @param defaultValue - значение по умолчанию
 * @returns загруженные данные или значение по умолчанию
 */
export const loadFromSessionStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const serialized = sessionStorage.getItem(key);
        if (serialized === null) return defaultValue;
        return JSON.parse(serialized) as T;
    } catch (error) {
        console.error(`Failed to load from sessionStorage: ${key}`, error);
        return defaultValue;
    }
};