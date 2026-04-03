/**
 * RGB цвет (компоненты от 0 до 255)
 */
export interface IRGBColor {
    /** Красный (0-255) */
    r: number;
    /** Зелёный (0-255) */
    g: number;
    /** Синий (0-255) */
    b: number;
}

/**
 * RGB цвет с альфа-каналом (компоненты от 0 до 255)
 */
export interface IRGBAColor extends IRGBColor {
    /** Прозрачность (0-255) */
    a: number;
}

/**
 * RGB цвет для Babylon.js (компоненты от 0 до 1)
 */
export interface IColor3 {
    /** Красный (0-1) */
    r: number;
    /** Зелёный (0-1) */
    g: number;
    /** Синий (0-1) */
    b: number;
}

/**
 * RGB цвет с альфа-каналом для Babylon.js (компоненты от 0 до 1)
 */
export interface IColor4 extends IColor3 {
    /** Прозрачность (0-1) */
    a: number;
}

/**
 * HSB/HSV цвет
 */
export interface IHSBColor {
    /** Оттенок (0-360) */
    h: number;
    /** Насыщенность (0-100) */
    s: number;
    /** Яркость (0-100) */
    b: number;
}

/**
 * HSL цвет
 */
export interface IHSLColor {
    /** Оттенок (0-360) */
    h: number;
    /** Насыщенность (0-100) */
    s: number;
    /** Светлота (0-100) */
    l: number;
}