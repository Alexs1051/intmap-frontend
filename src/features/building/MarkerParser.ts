// src/features/building/MarkerParser.ts

import { AbstractMesh, TransformNode, Node, Vector3 } from "@babylonjs/core";
import { injectable } from "inversify";
import { Logger } from "../../core/logger/Logger";
import { ParsedMarker, ParsedRoom, MarkerType } from "../../shared/types";

interface ParsingContext {
    currentRoom?: string;
    currentFloor?: number;
    markers: Map<string, ParsedMarker>;
    rooms: Map<string, ParsedRoom>;
    floorNumbers: Map<AbstractMesh | TransformNode, number>;
    floorCache?: Map<AbstractMesh | TransformNode, number | undefined>;
}

interface ConnectionInfo {
    from: string;
    to: string;
    bidirectional: boolean;
}

@injectable()
export class MarkerParser {
    private logger: Logger;

    constructor() {
        this.logger = Logger.getInstance().getLogger('MarkerParser');
    }

    private getFloorNumber(
        obj: AbstractMesh | TransformNode,
        floorNodeMap: Map<AbstractMesh | TransformNode, number>,
        cache: Map<AbstractMesh | TransformNode, number | undefined>
    ): number | undefined {
        // Проверяем кэш
        if (cache.has(obj)) return cache.get(obj);

        // Если объект сам является этажом
        if (floorNodeMap.has(obj)) {
            const floor = floorNodeMap.get(obj);
            cache.set(obj, floor);
            return floor;
        }

        // Поднимаемся по родительской цепочке
        let parent: Node | null = obj.parent;
        while (parent) {
            // Проверяем, что parent является AbstractMesh или TransformNode
            if (parent instanceof AbstractMesh || parent instanceof TransformNode) {
                if (floorNodeMap.has(parent)) {
                    const floor = floorNodeMap.get(parent);
                    cache.set(obj, floor);
                    return floor;
                }
            }
            parent = parent.parent;
        }

        cache.set(obj, undefined);
        return undefined;
    }

    public parseMarkersAndRooms(
        objects: (AbstractMesh | TransformNode)[],
        floorNodeMap: Map<AbstractMesh | TransformNode, number>
    ): { markers: Map<string, ParsedMarker>; rooms: Map<string, ParsedRoom> } {
        this.logger.debug('=== MarkerParser: processing objects ===');
        this.logger.debug(`FloorNodeMap size: ${floorNodeMap.size}`);

        const floorCache = new Map<AbstractMesh | TransformNode, number | undefined>();
        const context: ParsingContext = {
            markers: new Map(),
            rooms: new Map(),
            floorNumbers: floorNodeMap,
            floorCache
        };

        // Ищем Connections узел
        const connectionsNode = this.findConnectionsNode(objects);
        this.logger.debug(`Connections node found: ${connectionsNode ? connectionsNode.name : 'NO'}`);

        const connections = connectionsNode ? this.parseConnections(connectionsNode) : [];
        this.logger.debug(`Parsed ${connections.length} connections`);

        this.parseHierarchy(objects, context);

        this.applyConnections(context.markers, connections);

        this.logger.info(`Parsed ${context.markers.size} markers and ${context.rooms.size} rooms with ${connections.length} connections`);
        this.logger.debug(`Final markers:`, Array.from(context.markers.keys()));

        return {
            markers: context.markers,
            rooms: context.rooms
        };
    }

    private findConnectionsNode(objects: (AbstractMesh | TransformNode)[]): AbstractMesh | TransformNode | null {
        this.logger.debug('=== Looking for Connections node ===');

        for (const obj of objects) {
            this.logger.debug(`Checking object: ${obj.name}, type: ${obj.getClassName()}`);

            if (obj.name === 'Connections') {
                this.logger.debug(`Found Connections node: ${obj.name}`);
                return obj;
            }

            // Проверяем детей через getChildren() для TransformNode
            if (obj.getChildren && obj.getChildren().length > 0) {
                const children = obj.getChildren().filter(
                    child => child instanceof AbstractMesh || child instanceof TransformNode
                ) as (AbstractMesh | TransformNode)[];

                if (children.length > 0) {
                    const found = this.findConnectionsNode(children);
                    if (found) return found;
                }
            }

            // Также проверяем через getChildMeshes для обратной совместимости
            if (obj.getChildMeshes && obj.getChildMeshes().length > 0) {
                const found = this.findConnectionsNode(obj.getChildMeshes());
                if (found) return found;
            }
        }

        this.logger.debug('Connections node NOT found');
        return null;
    }

    private parseConnections(connectionsNode: AbstractMesh | TransformNode): ConnectionInfo[] {
        const connections: ConnectionInfo[] = [];

        this.logger.debug('=== Parsing Connections ===');

        const processNode = (node: AbstractMesh | TransformNode, depth: number = 0) => {
            const indent = '  '.repeat(depth);
            const name = node.name;

            this.logger.debug(`${indent}Processing node: ${name}, type: ${node.getClassName()}`);

            // Пропускаем сам контейнер Connections
            if (name === 'Connections') {
                this.logger.debug(`${indent}  -> Skipping Connections container`);
                // Используем getChildren() вместо getChildMeshes() для TransformNode
                if (node.getChildren && node.getChildren().length > 0) {
                    this.logger.debug(`${indent}  -> Processing ${node.getChildren().length} children via getChildren()`);
                    node.getChildren().forEach(child => {
                        if (child instanceof AbstractMesh || child instanceof TransformNode) {
                            processNode(child, depth + 1);
                        }
                    });
                } else if (node.getChildMeshes && node.getChildMeshes().length > 0) {
                    this.logger.debug(`${indent}  -> Processing ${node.getChildMeshes().length} children via getChildMeshes()`);
                    node.getChildMeshes().forEach(child => processNode(child, depth + 1));
                }
                return;
            }

            // Определяем, является ли связь односторонней (суффикс -S)
            const isBidirectional = !name.endsWith('-S');
            let cleanName = name;
            if (name.endsWith('-S')) {
                cleanName = name.slice(0, -2);
                this.logger.debug(`${indent}  -> One-way connection (suffix -S removed): ${cleanName}`);
            }

            // Обрабатываем связи
            if (cleanName.includes('-')) {
                const dashIndex = cleanName.indexOf('-');
                const leftPart = cleanName.substring(0, dashIndex);
                const rightPart = cleanName.substring(dashIndex + 1);

                this.logger.debug(`${indent}  -> Left part: ${leftPart}, Right part: ${rightPart}`);

                const leftTargets = leftPart.split('+');
                const rightTargets = rightPart.split('+');

                for (const fromTarget of leftTargets) {
                    for (const toTarget of rightTargets) {
                        const from = this.normalizeMarkerId(fromTarget);
                        const to = this.normalizeMarkerId(toTarget);

                        this.logger.debug(`${indent}    -> Creating connection: ${from} -> ${to}`);

                        if (from && to && from !== to) {
                            connections.push({
                                from,
                                to,
                                bidirectional: isBidirectional
                            });
                        }
                    }
                }
            } else {
                this.logger.debug(`${indent}  -> No dash found in name, skipping`);
            }

            // Рекурсивно обрабатываем дочерние узлы
            if (node.getChildren && node.getChildren().length > 0) {
                this.logger.debug(`${indent}  -> Processing ${node.getChildren().length} children via getChildren()`);
                node.getChildren().forEach(child => {
                    if (child instanceof AbstractMesh || child instanceof TransformNode) {
                        processNode(child, depth + 1);
                    }
                });
            } else if (node.getChildMeshes && node.getChildMeshes().length > 0) {
                this.logger.debug(`${indent}  -> Processing ${node.getChildMeshes().length} children via getChildMeshes()`);
                node.getChildMeshes().forEach(child => processNode(child, depth + 1));
            }
        };

        processNode(connectionsNode);

        this.logger.debug(`Total connections parsed: ${connections.length}`);
        connections.forEach((conn, idx) => {
            this.logger.debug(`  ${idx + 1}. ${conn.from} -> ${conn.to} (${conn.bidirectional ? 'two-way' : 'one-way'})`);
        });

        return connections;
    }

    private normalizeMarkerId(name: string): string {
        this.logger.debug(`Normalizing marker ID: ${name}`);

        // Удаляем кавычки если есть
        let cleanName = name.replace(/"/g, '');

        // Обработка MR_ маркеров с кавычками
        const mrMatch = cleanName.match(/^MR_(.+?)(?:_(\d+))?$/);
        if (mrMatch) {
            const baseName = mrMatch[1]!.replace(/\s+/g, '_');
            const suffix = mrMatch[2];
            const result = suffix ? `marker_${baseName}_${suffix}` : `marker_${baseName}`;
            this.logger.debug(`  MR marker: ${name} -> ${result}`);
            return result;
        }

        // Обработка FL_ маркеров
        const flMatch = cleanName.match(/^FL_(\d+)$/);
        if (flMatch) {
            const result = `flag_${flMatch[1]!}`;
            this.logger.debug(`  FL marker: ${name} -> ${result}`);
            return result;
        }

        // Обработка WP_ маркеров
        const wpMatch = cleanName.match(/^WP_(\d+)$/);
        if (wpMatch) {
            const result = `waypoint_${wpMatch[1]!}`;
            this.logger.debug(`  WP marker: ${name} -> ${result}`);
            return result;
        }

        // Если ничего не подошло, возвращаем как есть
        this.logger.debug(`  Unknown marker type: ${name} -> ${cleanName}`);
        return cleanName;
    }

    private parseHierarchy(
        objects: (AbstractMesh | TransformNode)[],
        context: ParsingContext,
        parentRoom?: string
    ): void {
        for (const obj of objects) {
            const name = obj.name;

            // Пропускаем Connections и его детей при парсинге маркеров
            if (name === 'Connections') {
                this.logger.debug(`Skipping Connections node and its children`);
                continue;
            }

            // Если объект начинается с префикса связи, пропускаем
            if (name.includes('-') && !name.startsWith('MR_') && !name.startsWith('FL_') && !name.startsWith('WP_')) {
                this.logger.debug(`Skipping connection node: ${name}`);
                continue;
            }

            // Определяем этаж для текущего объекта
            const floorNumber = context.floorCache
                ? this.getFloorNumber(obj, context.floorNumbers, context.floorCache)
                : undefined;

            // Если объект - комната
            if (name.startsWith('Room_')) {
                // Избегаем дублирования комнат
                if (context.rooms.has(name)) {
                    this.logger.debug(`Room ${name} already exists, skipping`);
                    // Всё равно обрабатываем детей, но без создания новой комнаты
                    if (obj.getChildMeshes && obj.getChildMeshes().length > 0) {
                        this.parseHierarchy(obj.getChildMeshes(), context, name);
                    }
                    continue;
                }

                const room: ParsedRoom = {
                    id: name,
                    name: name,
                    displayName: this.extractRoomDisplayName(name),
                    walls: [],
                    markers: [],
                    position: obj.position.clone(),
                    floorNumber
                };
                context.rooms.set(name, room);
                this.logger.debug(`Created room: ${name}, floor: ${floorNumber}`);

                if (obj.getChildMeshes && obj.getChildMeshes().length > 0) {
                    this.parseHierarchy(obj.getChildMeshes(), context, name);
                }
                continue;
            }

            // Пропускаем объекты Connections
            if (name === 'Connections' || name.includes('-')) {
                if (obj.getChildMeshes && obj.getChildMeshes().length > 0) {
                    this.parseHierarchy(obj.getChildMeshes(), context, parentRoom);
                }
                continue;
            }

            // Парсим маркеры
            let marker: ParsedMarker | null = null;

            if (name.startsWith('MR_')) {
                marker = this.parseMarker(name, obj, MarkerType.MARKER, floorNumber, parentRoom);
                if (marker) this.logger.debug(`Found MR marker: ${name} -> ${marker.id}, floor: ${floorNumber}`);
            } else if (name.startsWith('FL_')) {
                marker = this.parseMarker(name, obj, MarkerType.FLAG, floorNumber, parentRoom);
                if (marker) this.logger.debug(`Found FL marker: ${name} -> ${marker.id}, floor: ${floorNumber}`);
            } else if (name.startsWith('WP_') && !name.includes('-')) {
                marker = this.parseMarker(name, obj, MarkerType.WAYPOINT, floorNumber, parentRoom);
                if (marker) this.logger.debug(`Found WP marker: ${name} -> ${marker.id}, floor: ${floorNumber}`);
            }

            if (marker) {
                context.markers.set(marker.id, marker);
                if (parentRoom) {
                    const room = context.rooms.get(parentRoom);
                    if (room && !room.markers.includes(marker.id)) {
                        room.markers.push(marker.id);
                    }
                }
            }

            // Рекурсивно обрабатываем детей
            if (obj.getChildMeshes && obj.getChildMeshes().length > 0) {
                this.parseHierarchy(obj.getChildMeshes(), context, parentRoom);
            }
        }
    }

    private getWorldPosition(obj: AbstractMesh | TransformNode): Vector3 {
        // Берем локальную позицию маркера
        let localPos = obj.position.clone();
        let current: Node | null = obj.parent;

        while (current) {
            if (current instanceof AbstractMesh || current instanceof TransformNode) {
                // Применяем rotation и scaling родителя
                const matrix = current.computeWorldMatrix();
                localPos = Vector3.TransformCoordinates(localPos, matrix);
            }
            current = current.parent;
        }
        return localPos;
    }

    private parseMarker(
        name: string,
        obj: AbstractMesh | TransformNode,
        type: 'marker' | 'flag' | 'waypoint',
        floorNumber?: number,
        roomId?: string
    ): ParsedMarker | null {
        const worldPosition = this.getWorldPosition(obj);
        this.logger.debug(`Marker ${name}: world Y = ${worldPosition.y}`);

        // MR маркеры
        if (type === 'marker') {
            const mrMatch = name.match(/^MR_"(.+?)"(?:_(\d+))?$/);
            if (mrMatch) {
                const baseName = mrMatch[1];
                if (!baseName) return null;

                const suffix = mrMatch[2];
                const normalizedBase = baseName.replace(/\s+/g, '_');
                const id = suffix ? `marker_${normalizedBase}_${suffix}` : `marker_${normalizedBase}`;
                const displayName = suffix ? `${baseName} ${suffix}` : baseName;

                return {
                    parsedMarker: id,  // ✅ добавляем обязательное поле
                    id,
                    type: 'marker',
                    name: baseName,
                    displayName,
                    position: worldPosition,
                    connections: [],
                    floorNumber,
                    roomId,
                    metadata: { suffix, number: suffix }
                };
            }
        }

        // FL маркеры
        if (type === 'flag') {
            const flMatch = name.match(/^FL_(\d+)$/);
            if (flMatch) {
                const number = flMatch[1];
                if (!number) return null;
                const id = `flag_${number}`;

                return {
                    parsedMarker: id,  // ✅ добавляем обязательное поле
                    id,
                    type: 'flag',
                    name: `Флаг ${number}`,
                    displayName: `Флаг ${number}`,
                    position: worldPosition,
                    connections: [],
                    floorNumber,
                    roomId,
                    metadata: { number, qr: this.generateQRCode(number) }
                };
            }
        }

        // WP маркеры
        if (type === 'waypoint') {
            const wpMatch = name.match(/^WP_(\d+)$/);
            if (wpMatch) {
                const number = wpMatch[1];
                if (!number) return null;
                const id = `waypoint_${number}`;

                return {
                    parsedMarker: id,  // ✅ добавляем обязательное поле
                    id,
                    type: 'waypoint',
                    name: `Точка ${number}`,
                    displayName: `Точка ${number}`,
                    position: worldPosition,
                    connections: [],
                    floorNumber,
                    roomId,
                    metadata: { number }
                };
            }
        }

        return null;
    }

    private extractRoomDisplayName(name: string): string {
        const match = name.match(/Room_(\d+)/);
        if (match && match[1]) {
            return `Комната ${parseInt(match[1], 10)}`;
        }
        return name;
    }

    private generateQRCode(number: string): string {
        return `https://example.com/flag/${number}`;
    }

    private applyConnections(markers: Map<string, ParsedMarker>, connections: ConnectionInfo[]): void {
        this.logger.debug(`=== Applying ${connections.length} connections ===`);

        let appliedCount = 0;
        let skippedCount = 0;

        for (const conn of connections) {
            const fromMarker = markers.get(conn.from);
            const toMarker = markers.get(conn.to);

            if (!fromMarker) {
                this.logger.debug(`WARNING: Source marker not found: ${conn.from}`);
                skippedCount++;
                continue;
            }

            if (!toMarker) {
                this.logger.debug(`WARNING: Target marker not found: ${conn.to}`);
                skippedCount++;
                continue;
            }

            // Добавляем связь от from к to
            if (!fromMarker.connections.includes(conn.to)) {
                fromMarker.connections.push(conn.to);
                this.logger.debug(`Added connection: ${conn.from} -> ${conn.to}`);
            }

            // Если двунаправленная, добавляем обратную связь
            if (conn.bidirectional && !toMarker.connections.includes(conn.from)) {
                toMarker.connections.push(conn.from);
                this.logger.debug(`Added reverse connection: ${conn.to} -> ${conn.from}`);
            }

            appliedCount++;
        }

        this.logger.debug(`Connections applied: ${appliedCount}, skipped: ${skippedCount}`);

        // Выводим статистику по маркерам со связями
        let markersWithConnections = 0;
        let totalConnections = 0;

        for (const marker of markers.values()) {
            if (marker.connections.length > 0) {
                markersWithConnections++;
                totalConnections += marker.connections.length;
                this.logger.debug(`Marker ${marker.id} has ${marker.connections.length} connections: ${marker.connections.join(', ')}`);
            }
        }

        this.logger.debug(`Markers with connections: ${markersWithConnections}, total connections: ${totalConnections}`);
    }
}