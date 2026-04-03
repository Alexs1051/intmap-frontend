import { Color3 } from "@babylonjs/core";

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + ((1 << 24) + (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255)).toString(16).slice(1);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    if (!hex || typeof hex !== 'string') return null;
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1]!, 16) / 255,
        g: parseInt(result[2]!, 16) / 255,
        b: parseInt(result[3]!, 16) / 255
    } : null;
}

export function rgbToColor3(color: { r: number; g: number; b: number }): Color3 {
    return new Color3(color.r, color.g, color.b);
}

export function color3ToRgb(color: Color3): { r: number; g: number; b: number } {
    return { r: color.r, g: color.g, b: color.b };
}

export function color3ToHex(color: Color3): string {
    return rgbToHex(color.r, color.g, color.b);
}

export function mixColors(color1: Color3, color2: Color3, factor: number): Color3 {
    return new Color3(
        color1.r * (1 - factor) + color2.r * factor,
        color1.g * (1 - factor) + color2.g * factor,
        color1.b * (1 - factor) + color2.b * factor
    );
}

export function darkenColor(color: Color3, amount: number): Color3 {
    return new Color3(
        Math.max(0, color.r * (1 - amount)),
        Math.max(0, color.g * (1 - amount)),
        Math.max(0, color.b * (1 - amount))
    );
}

export function lightenColor(color: Color3, amount: number): Color3 {
    return new Color3(
        Math.min(1, color.r + (1 - color.r) * amount),
        Math.min(1, color.g + (1 - color.g) * amount),
        Math.min(1, color.b + (1 - color.b) * amount)
    );
}