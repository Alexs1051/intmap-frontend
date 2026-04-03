import { Vector3 } from "@babylonjs/core";
import { MarkerData, RGBA, MarkerType } from "@shared/types";

export const FLAG_COLORS: {
    bg: RGBA;
    text: RGBA;
} = {
    bg: { r: 0.2, g: 0.3, b: 0.8, a: 0.9 },
    text: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }
};

export interface FlagDefinition {
    id: string;
    name: string;
    position: Vector3;
    qr?: string;
}

export const FLAG_DEFINITIONS: FlagDefinition[] = [
    {
        id: "flag-1",
        name: "fl_01",
        position: new Vector3(-5, 5, -5),
        qr: "https://example.com/flag1"
    },
    {
        id: "flag-2",
        name: "fl_02",
        position: new Vector3(5, 5, 5),
        qr: "https://example.com/flag2"
    },
    {
        id: "flag-3",
        name: "fl_03",
        position: new Vector3(0, 5, 0),
        qr: "https://example.com/flag3"
    }
];

export function createFlags(floor: number = 3): MarkerData[] {
    return FLAG_DEFINITIONS.map(def => ({
        id: def.id,
        type: MarkerType.FLAG,
        position: def.position,
        name: def.name,
        iconName: 'flag',
        backgroundColor: FLAG_COLORS.bg,
        textColor: FLAG_COLORS.text,
        qr: def.qr,
        floor,
        connections: []
    }));
}