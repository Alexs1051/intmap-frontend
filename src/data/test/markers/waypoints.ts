import { Vector3 } from "@babylonjs/core";
import { MarkerData, MarkerType, RGBA } from "@shared/types";

export const WAYPOINT_COLORS: {
    bg: RGBA;
    text: RGBA;
} = {
    bg: { r: 0.8, g: 0.2, b: 0.2, a: 0.9 },
    text: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }
};

export function createOuterRing(radius: number, count: number, floor: number = 1): MarkerData[] {
    const waypoints: MarkerData[] = [];
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        waypoints.push({
            id: `wp_outer_${i + 1}`,
            type: MarkerType.WAYPOINT,
            position: new Vector3(x, 0, z),
            name: `outer_${i + 1}`,
            iconName: i % 2 === 0 ? 'trip_origin' : 'fiber_manual_record',
            backgroundColor: WAYPOINT_COLORS.bg,
            textColor: WAYPOINT_COLORS.text,
            floor,
            connections: []
        });
    }
    
    return waypoints;
}

export function createInnerRing(radius: number, count: number, floor: number = 1): MarkerData[] {
    const waypoints: MarkerData[] = [];
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        waypoints.push({
            id: `wp_inner_${i + 1}`,
            type: MarkerType.WAYPOINT,
            position: new Vector3(x, 0, z),
            name: `inner_${i + 1}`,
            iconName: i % 2 === 0 ? 'trip_origin' : 'fiber_manual_record',
            backgroundColor: WAYPOINT_COLORS.bg,
            textColor: WAYPOINT_COLORS.text,
            floor,
            connections: []
        });
    }
    
    return waypoints;
}

export function createExtraWaypoints(positions: Vector3[], floor: number = 1): MarkerData[] {
    return positions.map((pos, index) => ({
        id: `wp_extra_${index + 1}`,
        type: MarkerType.WAYPOINT,
        position: pos,
        name: `extra_${index + 1}`,
        iconName: 'fiber_manual_record',
        backgroundColor: WAYPOINT_COLORS.bg,
        textColor: WAYPOINT_COLORS.text,
        floor,
        connections: []
    }));
}