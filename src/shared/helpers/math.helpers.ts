/**
 * Ограничивает число в заданном диапазоне
 * @param value - число
 * @param min - минимум
 * @param max - максимум
 * @returns ограниченное число
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

/**
 * Линейная интерполяция
 * @param a - начальное значение
 * @param b - конечное значение
 * @param t - коэффициент (0-1)
 * @returns интерполированное значение
 */
export const lerp = (a: number, b: number, t: number): number => {
    return a + (b - a) * t;
};

/**
 * Преобразует градусы в радианы
 * @param degrees - градусы
 * @returns радианы
 */
export const degToRad = (degrees: number): number => {
    return degrees * Math.PI / 180;
};

/**
 * Преобразует радианы в градусы
 * @param radians - радианы
 * @returns градусы
 */
export const radToDeg = (radians: number): number => {
    return radians * 180 / Math.PI;
};

/**
 * Вычисляет расстояние между двумя точками в 2D
 * @param x1 - x первой точки
 * @param y1 - y первой точки
 * @param x2 - x второй точки
 * @param y2 - y второй точки
 * @returns расстояние
 */
export const distance2D = (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Округляет число до указанного количества знаков
 * @param value - число
 * @param decimals - количество знаков
 * @returns округлённое число
 */
export const round = (value: number, decimals: number = 0): number => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
};

/**
 * Проверяет, находится ли число в диапазоне
 * @param value - число
 * @param min - минимум
 * @param max - максимум
 * @returns true если в диапазоне
 */
export const inRange = (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
};

/**
 * Нормализует угол в радианах
 * @param angle - угол в радианах
 * @returns нормализованный угол (0 - 2π)
 */
export const normalizeAngle = (angle: number): number => {
    const twoPi = Math.PI * 2;
    let normalized = angle % twoPi;
    if (normalized < 0) normalized += twoPi;
    return normalized;
};