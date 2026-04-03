import { Vector3 } from "@babylonjs/core";
import { createOuterRing, createInnerRing, createExtraWaypoints } from './waypoints';
import { createMarkers } from './markers';
import { createFlags } from './flags';
import { connectRing, connectSets, connectByDistance } from './connections';
import { MarkerData } from "@shared/types";

const EXTRA_POSITIONS: Vector3[] = [
    new Vector3(5, 0, 5), new Vector3(-5, 0, 5),
    new Vector3(5, 0, -5), new Vector3(-5, 0, -5),
    new Vector3(8, 0, 8), new Vector3(-8, 0, 8),
    new Vector3(8, 0, -8), new Vector3(-8, 0, -8),
    new Vector3(0, 0, 10), new Vector3(10, 0, 0),
    new Vector3(-10, 0, 0), new Vector3(0, 0, -10),
    new Vector3(15, 0, 0), new Vector3(0, 0, 15),
    new Vector3(-15, 0, 0), new Vector3(0, 0, -15)
];

export function createTestMarkers(): MarkerData[] {
    const outerRing = createOuterRing(25, 8);
    const innerRing = createInnerRing(12, 6);
    const extraWaypoints = createExtraWaypoints(EXTRA_POSITIONS);
    
    const allWaypoints = [...outerRing, ...innerRing, ...extraWaypoints];
    
    connectRing(outerRing);
    connectRing(innerRing);
    connectSets(outerRing, innerRing, 2);
    connectSets(innerRing, outerRing, 3);
    connectSets(extraWaypoints, allWaypoints.slice(0, outerRing.length + innerRing.length), 3);
    connectByDistance(extraWaypoints, 12);
    
    const markers = createMarkers(3);
    const flags = createFlags(3);
    
    const allPoints = [...allWaypoints];
    connectSets(markers, allPoints, 1);
    connectSets(flags, allPoints, 1);
    
    // ✅ Фильтруем undefined значения
    return [...allWaypoints, ...markers, ...flags].filter(m => m);
}

export function getTestMarkersStats(): {
    total: number;
    waypoints: number;
    markers: number;
    flags: number;
    connections: number;
} {
    const all = createTestMarkers();
    const waypoints = all.filter(m => m?.type === 'waypoint');
    const markers = all.filter(m => m?.type === 'marker');
    const flags = all.filter(m => m?.type === 'flag');
    
    const connections = all.reduce(
        (sum, m) => sum + (m?.connections?.length || 0),
        0
    );
    
    return {
        total: all.length,
        waypoints: waypoints.length,
        markers: markers.length,
        flags: flags.length,
        connections
    };
}

export { WAYPOINT_COLORS } from './waypoints';
export { MARKER_COLORS } from './markers';
export { FLAG_COLORS } from './flags';