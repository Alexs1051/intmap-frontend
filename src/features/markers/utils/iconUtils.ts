import { Color3 } from "@babylonjs/core";
import { RGBA } from "../types";

/**
 * Конвертировать RGBA в CSS строку
 */
export function rgbaToCss(color: RGBA): string {
  return `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${color.a})`;
}

/**
 * Конвертировать RGBA в hex (без прозрачности)
 */
export function rgbaToHex(color: RGBA): string {
  const toHex = (n: number) => {
    const hex = Math.floor(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/**
 * Получить контрастный цвет текста (белый или черный)
 */
export function getContrastColor(backgroundColor: RGBA): { r: number; g: number; b: number; a: number } {
  // Вычисляем яркость фона (формула ITU-R BT.709)
  const luminance = 0.2126 * backgroundColor.r + 0.7152 * backgroundColor.g + 0.0722 * backgroundColor.b;
  
  // Если фон темный - белый текст, если светлый - черный
  if (luminance < 0.5) {
    return { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
  } else {
    return { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }; // Не чисто черный, а темно-серый
  }
}

/**
 * Получить цвет текста, который хорошо сочетается с фоном
 */
export function getHarmoniousTextColor(backgroundColor: RGBA): { r: number; g: number; b: number; a: number } {
  const luminance = 0.2126 * backgroundColor.r + 0.7152 * backgroundColor.g + 0.0722 * backgroundColor.b;
  
  if (luminance < 0.5) {
    // Для темных фонов - светлые, но не белые оттенки
    return { 
      r: Math.min(1.0, backgroundColor.r + 0.7), 
      g: Math.min(1.0, backgroundColor.g + 0.7), 
      b: Math.min(1.0, backgroundColor.b + 0.7), 
      a: 1.0 
    };
  } else {
    // Для светлых фонов - темные, но не черные оттенки
    return { 
      r: Math.max(0.0, backgroundColor.r - 0.7), 
      g: Math.max(0.0, backgroundColor.g - 0.7), 
      b: Math.max(0.0, backgroundColor.b - 0.7), 
      a: 1.0 
    };
  }
}

/**
 * Проверить, является ли цвет белым
 */
export function isWhite(color: RGBA, threshold: number = 0.9): boolean {
  return color.r > threshold && color.g > threshold && color.b > threshold;
}