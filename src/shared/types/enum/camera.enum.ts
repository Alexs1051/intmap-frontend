/**
 * Режимы работы камеры
 */
export enum CameraMode {
    /** Орбитальный режим - камера вращается вокруг точки интереса */
    ORBIT = 'orbit',
    /** Режим сверху вниз (2D карта) */
    TOP_DOWN = 'top_down',
    /** Режим свободного полёта (FPS) */
    FREE_FLIGHT = 'free_flight'
}