import { Color3 } from "@babylonjs/core";

// ========================================
// НАСТРОЙКИ ГРАДИЕНТА НЕБА
// ========================================

/**
 * Цвет верхней части неба (зенит)
 * Можно использовать Hex или RGB
 */
export const SKY_COLOR_TOP = Color3.FromHexString("#4a90e2"); // Тёмно-синий, почти ночной

/**
 * Цвет средней точки градиента (опционально)
 * Если не нужен - оставьте null
 */
export const SKY_COLOR_MIDDLE: Color3 | null = Color3.FromHexString("#7bb0e6"); // Промежуточный

/**
 * Цвет нижней части неба (горизонт)
 */
export const SKY_COLOR_BOTTOM = Color3.FromHexString("#b3d9ff"); // Ярко-голубой

/**
 * Позиции цветов в градиенте (0 = верх, 1 = низ)
 */
export const SKY_GRADIENT_STOPS = {
  top: 0.0,      // Верхняя точка
  middle: 0.4,   // Средняя точка (если используется)
  bottom: 1.0    // Нижняя точка
};

/**
 * Интенсивность свечения неба
 */
export const SKY_EMISSIVE_INTENSITY = 0.8;

/**
 * Прозрачность небесной сферы (0 = прозрачно, 1 = непрозрачно)
 */
export const SKY_OPACITY = 0.9;

/**
 * Сплющивание небесной сферы (чем меньше, тем более плоское небо)
 */
export const SKY_DOME_FLATTENING = 0.3;

// ========================================
// НАСТРОЙКИ ТУМАНА
// ========================================

/**
 * Включить туман
 */
export const FOG_ENABLED = true;

/**
 * Плотность тумана (чем больше, тем гуще)
 */
export const FOG_DENSITY = 0.002;

/**
 * Цвет тумана (обычно под цвет горизонта)
 */
export const FOG_COLOR = SKY_COLOR_BOTTOM;

// ========================================
// НАСТРОЙКИ СЕТКИ
// ========================================

export const GRID_SIZE = 200;
export const GRID_DIVISIONS = 200;
export const GRID_COLOR_MAIN = Color3.FromHexString("#e6e6e6");
export const GRID_COLOR_SECONDARY = Color3.FromHexString("#b8b8b8");

/**
 * Толщина основных линий
 */
export const GRID_MAIN_LINE_THICKNESS = 0.8;

/**
 * Толщина второстепенных линий
 */
export const GRID_SECONDARY_LINE_THICKNESS = 0.3;

/**
 * Яркость осей X и Z
 */
export const GRID_AXIS_BRIGHTNESS = 2.0;