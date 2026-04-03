/**
 * Задержка выполнения (Promise-based setTimeout)
 * @param ms - задержка в миллисекундах
 * @returns Promise
 */
export const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Повторяет выполнение функции при ошибке
 * @param fn - асинхронная функция
 * @param retries - количество попыток
 * @param delayMs - задержка между попытками
 * @returns результат выполнения
 */
export const retry = async <T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delayMs: number = 1000
): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await delay(delayMs);
        return retry(fn, retries - 1, delayMs);
    }
};

/**
 * Ограничивает частоту выполнения функции (throttle)
 * @param fn - функция
 * @param limitMs - ограничение в миллисекундах
 * @returns throttled функция
 */
export const throttle = <T extends (...args: any[]) => any>(
    fn: T,
    limitMs: number
): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= limitMs) {
            lastCall = now;
            fn(...args);
        }
    };
};

/**
 * Откладывает выполнение функции (debounce)
 * @param fn - функция
 * @param delayMs - задержка в миллисекундах
 * @returns debounced функция
 */
export const debounce = <T extends (...args: any[]) => any>(
    fn: T,
    delayMs: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delayMs);
    };
};