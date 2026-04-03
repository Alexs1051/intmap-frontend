/**
 * Измеряет время выполнения функции
 * @param fn - функция для измерения
 * @param label - метка для вывода
 * @returns результат выполнения функции
 */
export const measureTime = <T>(fn: () => T, label?: string): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    if (label) {
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    }
    return result;
};

/**
 * Асинхронное измерение времени выполнения
 * @param fn - асинхронная функция для измерения
 * @param label - метка для вывода
 * @returns результат выполнения функции
 */
export const measureTimeAsync = async <T>(
    fn: () => Promise<T>,
    label?: string
): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    if (label) {
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    }
    return result;
};

/**
 * Получает FPS (кадры в секунду)
 * @returns текущий FPS
 */
let lastFrameTime = performance.now();
let frameCount = 0;
let currentFps = 0;

export const updateFPS = (): number => {
    frameCount++;
    const now = performance.now();
    const delta = now - lastFrameTime;
    
    if (delta >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFrameTime = now;
    }
    
    return currentFps;
};

/**
 * Запрашивает кадр анимации с Promise
 * @returns Promise, который разрешается при следующем кадре
 */
export const nextFrame = (): Promise<void> => {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
};