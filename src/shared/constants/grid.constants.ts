import { Color3 } from "@babylonjs/core";

export const GRID = {
    SIZE: 200,
    LINES: 802,
    
    MAIN_STEP: 5,
    SECONDARY_STEP: 1,
    
    MAIN_COLOR: Color3.FromHexString("#e6e6e6"),
    SECONDARY_COLOR: Color3.FromHexString("#b8b8b8"),
    AXIS_X_COLOR: Color3.FromHexString("#0000ff"),
    AXIS_Z_COLOR: Color3.FromHexString("#ff0000"),
    
    DEFAULT_OPACITY: 1
} as const;