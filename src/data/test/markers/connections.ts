import { Vector3 } from "@babylonjs/core";
import { MarkerData } from "@shared/types";

type ConnectionDirection = 'one-way' | 'two-way';

const TWO_WAY: ConnectionDirection = 'two-way';

/**
 * Соединить точки в кольцо
 */
export function connectRing(waypoints: MarkerData[]): void {
    const count = waypoints.length;
    
    for (let i = 0; i < count; i++) {
        const current = waypoints[i];
        const next = waypoints[(i + 1) % count];
        const prev = waypoints[(i - 1 + count) % count];
        
        // ✅ Проверяем, что элементы существуют
        if (!current) continue;
        if (!next) continue;
        if (!prev) continue;
        
        if (!current.connections) {
            current.connections = [];
        }
        
        if (!current.connections.some(c => c.toId === next.id)) {
            current.connections.push({
                fromId: current.id,
                toId: next.id,
                direction: TWO_WAY
            });
        }
        
        if (!current.connections.some(c => c.toId === prev.id)) {
            current.connections.push({
                fromId: current.id,
                toId: prev.id,
                direction: TWO_WAY
            });
        }
    }
}

/**
 * Соединить два набора точек
 */
export function connectSets(
    first: MarkerData[],
    second: MarkerData[],
    connectionsPerPoint: number = 2
): void {
    for (const point of first) {
        // ✅ Проверяем, что point существует
        if (!point) continue;
        
        if (!point.connections) {
            point.connections = [];
        }
        
        const distances = second.map((p, idx) => ({
            point: p,
            index: idx,
            dist: Vector3.Distance(point.position, p.position)
        })).filter(item => item.point); // ✅ Фильтруем undefined
        
        distances.sort((a, b) => a.dist - b.dist);
        
        for (let i = 0; i < Math.min(connectionsPerPoint, distances.length); i++) {
            const target = distances[i]?.point;
            
            // ✅ Проверяем, что target существует
            if (!target) continue;
            
            if (!point.connections.some(c => c.toId === target.id)) {
                point.connections.push({
                    fromId: point.id,
                    toId: target.id,
                    direction: TWO_WAY
                });
            }
        }
    }
}

/**
 * Соединить точки по расстоянию
 */
export function connectByDistance(points: MarkerData[], maxDistance: number): void {
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        
        // ✅ Проверяем, что p1 существует
        if (!p1) continue;
        
        if (!p1.connections) {
            p1.connections = [];
        }
        
        for (let j = i + 1; j < points.length; j++) {
            const p2 = points[j];
            
            // ✅ Проверяем, что p2 существует
            if (!p2) continue;
            
            if (!p2.connections) {
                p2.connections = [];
            }
            
            const dist = Vector3.Distance(p1.position, p2.position);
            
            if (dist <= maxDistance) {
                if (!p1.connections.some(c => c.toId === p2.id)) {
                    p1.connections.push({
                        fromId: p1.id,
                        toId: p2.id,
                        direction: TWO_WAY
                    });
                }
            }
        }
    }
}

/**
 * Добавить связь между двумя точками
 */
export function addConnection(
    from: MarkerData,
    to: MarkerData,
    direction: ConnectionDirection = TWO_WAY
): void {
    if (!from || !to) return;
    
    if (!from.connections) {
        from.connections = [];
    }
    
    if (!to.connections) {
        to.connections = [];
    }
    
    const exists = from.connections.some(c => c.toId === to.id);
    if (!exists) {
        from.connections.push({
            fromId: from.id,
            toId: to.id,
            direction
        });
    }
    
    if (direction === TWO_WAY) {
        const reverseExists = to.connections.some(c => c.toId === from.id);
        if (!reverseExists) {
            to.connections.push({
                fromId: to.id,
                toId: from.id,
                direction
            });
        }
    }
}