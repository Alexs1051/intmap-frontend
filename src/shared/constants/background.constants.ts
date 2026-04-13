import { Color3 } from "@babylonjs/core";

export const BACKGROUND = {
    // Sky colors
    SKY_TOP: Color3.FromHexString("#4a90e2"),
    SKY_MIDDLE: Color3.FromHexString("#7bb0e6"),
    SKY_BOTTOM: Color3.FromHexString("#b3d9ff"),

    // Sky sphere
    SKY_DIAMETER: 1000,

    // Fog
    FOG_DENSITY: 0.02,
    FOG_COLOR: new Color3(0.2, 0.2, 0.3),
    FOG_ENABLED: false,

    // Gradient
    GRADIENT_ENABLED: true
} as const;