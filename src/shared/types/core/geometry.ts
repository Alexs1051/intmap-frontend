/**
 * Точка в 2D пространстве
 */
export interface IPoint2D {
    /** Координата X */
    x: number;
    /** Координата Y */
    y: number;
}

/**
 * Точка в 3D пространстве
 */
export interface IPoint3D {
    /** Координата X */
    x: number;
    /** Координата Y */
    y: number;
    /** Координата Z */
    z: number;
}

/**
 * Точка (универсальная, 2D или 3D)
 */
export type IPoint = IPoint2D | IPoint3D;

/**
 * Прямоугольник
 */
export interface IRect {
    /** Координата X левого верхнего угла */
    x: number;
    /** Координата Y левого верхнего угла */
    y: number;
    /** Ширина прямоугольника */
    width: number;
    /** Высота прямоугольника */
    height: number;
}

/**
 * Размеры
 */
export interface ISize {
    /** Ширина */
    width: number;
    /** Высота */
    height: number;
}

/**
 * Интервал значений
 */
export interface IRange {
    /** Минимальное значение */
    min: number;
    /** Максимальное значение */
    max: number;
}

/**
 * Вектор (2D или 3D)
 */
export interface IVector2D {
    x: number;
    y: number;
}

export interface IVector3D {
    x: number;
    y: number;
    z: number;
}

export type IVector = IVector2D | IVector3D;

/**
 * Матрица трансформации
 */
export interface ITransformMatrix {
    /** Матрица 4x4 */
    matrix: number[][];
}