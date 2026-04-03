import { Vector3 } from "@babylonjs/core";
import { MarkerData, RGBA, MarkerType } from "@shared/types";

import entranceDescription from './descriptions/entrance.md';
import elevatorDescription from './descriptions/elevator.md';
import cafeDescription from './descriptions/cafe.md';
import infoDescription from './descriptions/info.md';

const DEFAULT_BG_COLOR: RGBA = { r: 0.2, g: 0.4, b: 0.8, a: 0.9 };
const DEFAULT_TEXT_COLOR: RGBA = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };

export const MARKER_COLORS: Record<string, { bg: RGBA; text: RGBA }> = {
    entrance: { bg: { r: 0.2, g: 0.6, b: 0.3, a: 0.9 }, text: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 } },
    elevator: { bg: { r: 0.8, g: 0.3, b: 0.2, a: 0.9 }, text: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 } },
    cafe: { bg: { r: 0.9, g: 0.6, b: 0.2, a: 0.9 }, text: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 } },
    info: { bg: { r: 0.2, g: 0.4, b: 0.8, a: 0.9 }, text: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 } }
};

export interface MarkerDefinition {
    id: string;
    name: string;
    position: Vector3;
    floor: number;
    iconName: string;
    description: string;
    colorType: keyof typeof MARKER_COLORS;
}

export const MARKER_DEFINITIONS: MarkerDefinition[] = [
    {
        id: "entrance-1",
        name: "СЕВЕРНЫЙ ВХОД",
        position: new Vector3(-20, 5, -20),
        floor: 1,
        iconName: 'door_front',
        description: entranceDescription,
        colorType: 'entrance'
    },
    {
        id: "entrance-2",
        name: "ЮЖНЫЙ ВХОД",
        position: new Vector3(20, 5, 20),
        floor: 1,
        iconName: 'door_front',
        description: entranceDescription,
        colorType: 'entrance'
    },
    {
        id: "elevator-1",
        name: "ЛИФТ A",
        position: new Vector3(-10, 5, 0),
        floor: 1,
        iconName: 'elevator',
        description: elevatorDescription,
        colorType: 'elevator'
    },
    {
        id: "elevator-2",
        name: "ЛИФТ B",
        position: new Vector3(10, 5, 0),
        floor: 1,
        iconName: 'elevator',
        description: elevatorDescription,
        colorType: 'elevator'
    },
    {
        id: "cafe",
        name: "КАФЕ",
        position: new Vector3(-15, 5, 15),
        floor: 1,
        iconName: 'local_cafe',
        description: cafeDescription,
        colorType: 'cafe'
    },
    {
        id: "info",
        name: "ИНФОРМАЦИЯ",
        position: new Vector3(15, 5, -15),
        floor: 1,
        iconName: 'info',
        description: infoDescription,
        colorType: 'info'
    }
];

/**
 * Создать маркеры из определений
 */
export function createMarkers(floor: number = 3): MarkerData[] {
    return MARKER_DEFINITIONS.map(def => {
        const colors = MARKER_COLORS[def.colorType];
        const bgColor = colors?.bg ?? DEFAULT_BG_COLOR;
        const textColor = colors?.text ?? DEFAULT_TEXT_COLOR;
        
        return {
            id: def.id,
            type: MarkerType.MARKER,
            position: def.position,
            name: def.name,
            iconName: def.iconName,
            description: def.description,
            backgroundColor: bgColor,
            textColor: textColor,
            floor,
            connections: []
        };
    });
}