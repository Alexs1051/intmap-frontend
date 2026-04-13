import { Color3, Vector3 } from "@babylonjs/core";

export const LIGHTING = {
    // Интенсивность
    HEMISPHERIC_INTENSITY: 0.8,
    DIRECTIONAL_INTENSITY: 1.2,

    // Цвета
    HEMISPHERIC_COLOR: new Color3(1, 1, 1),
    DIRECTIONAL_COLOR: new Color3(1, 1, 1),

    // Направление направленного света
    DIRECTION: new Vector3(-1, -2, -1),

    // Позиция направленного света
    POSITION: new Vector3(20, 30, 20),

    // Спекулярные значения
    HEMISPHERIC_SPECULAR: new Color3(0.1, 0.1, 0.1),
    DIRECTIONAL_SPECULAR: new Color3(0.5, 0.5, 0.5),

    // Цвет земли (hemispheric)
    GROUND_COLOR: new Color3(0.5, 0.5, 0.5),

    // Тени
    SHADOWS_ENABLED: false,
    SHADOW_MAP_SIZE: 1024,
    SHADOW_BLUR_SCALE: 2,

    // Границы интенсивности
    MIN_INTENSITY: 0,
    MAX_INTENSITY: 2
} as const;
