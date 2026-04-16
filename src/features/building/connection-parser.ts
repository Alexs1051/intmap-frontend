import { AbstractMesh, TransformNode, Vector3 } from "@babylonjs/core";
import { ParsedMarker, MarkerType, UserInfo } from "@shared/types";

/**
 * Информация о соединении между маркерами
 */
interface ConnectionInfo {
    from: string;
    to: string;
    bidirectional: boolean;
}

/**
 * Парсер соединений между маркерами
 * Отвечает только за поиск узла Connections и разбор связей
 */
export class ConnectionParser {
    /**
     * Найти узел Connections и распарсить соединения
     */
    public parse(
        objects: (AbstractMesh | TransformNode)[]
    ): ConnectionInfo[] {
        const connectionsNode = this.findConnectionsNode(objects);
        if (!connectionsNode) return [];

        return this.parseConnections(connectionsNode);
    }

    /**
     * Применить соединения к маркерам
     */
    public applyToMarkers(
        markers: Map<string, ParsedMarker>,
        connections: ConnectionInfo[]
    ): void {
        for (const conn of connections) {
            this.applyConnection(markers, conn);
        }
    }

    /**
     * Найти узел Connections в иерархии
     */
    private findConnectionsNode(objects: (AbstractMesh | TransformNode)[]): AbstractMesh | TransformNode | null {
        for (const obj of objects) {
            if (obj.name === 'Connections') return obj;

            const children = this.getChildren(obj);
            if (children.length > 0) {
                const found = this.findConnectionsNode(children);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Распарсить соединения из узла Connections
     */
    private parseConnections(connectionsNode: AbstractMesh | TransformNode): ConnectionInfo[] {
        const connections: ConnectionInfo[] = [];

        const processNode = (node: AbstractMesh | TransformNode) => {
            if (node.name === 'Connections') {
                this.getChildren(node).forEach(child => processNode(child));
                return;
            }

            const isBidirectional = !node.name.endsWith('-S');
            const cleanName = node.name.endsWith('-S') ? node.name.slice(0, -2) : node.name;

            if (cleanName.includes('-')) {
                this.parseConnectionString(cleanName, isBidirectional, connections);
            }

            this.getChildren(node).forEach(child => processNode(child));
        };

        processNode(connectionsNode);
        return connections;
    }

    /**
     * Распарсить строку соединения вида "A-B" или "A+B1+B2-C+D"
     */
    private parseConnectionString(
        name: string,
        isBidirectional: boolean,
        connections: ConnectionInfo[]
    ): void {
        const dashIndex = name.indexOf('-');
        const leftPart = name.substring(0, dashIndex);
        const rightPart = name.substring(dashIndex + 1);

        const leftTargets = leftPart.split('+');
        const rightTargets = rightPart.split('+');

        for (const fromTarget of leftTargets) {
            for (const toTarget of rightTargets) {
                const from = this.normalizeMarkerId(fromTarget);
                const to = this.normalizeMarkerId(toTarget);

                if (from && to && from !== to) {
                    connections.push({ from, to, bidirectional: isBidirectional });
                }
            }
        }
    }

    /**
     * Применить одно соединение к маркерам
     */
    private applyConnection(
        markers: Map<string, ParsedMarker>,
        conn: ConnectionInfo
    ): void {
        const fromMarker = markers.get(conn.from);
        const toMarker = markers.get(conn.to);

        if (!fromMarker || !toMarker) return;

        if (!fromMarker.connections.includes(conn.to)) {
            fromMarker.connections.push(conn.to);
        }

        if (conn.bidirectional && !toMarker.connections.includes(conn.from)) {
            toMarker.connections.push(conn.from);
        }
    }

    /**
     * Нормализовать ID маркера из имени узла
     */
    private normalizeMarkerId(name: string): string {
        let cleanName = name.replace(/"/g, '');

        const mrMatch = cleanName.match(/^MR_(.+?)(?:_(\d+))?$/);
        if (mrMatch) {
            const baseName = mrMatch[1]!.replace(/\s+/g, '_');
            const suffix = mrMatch[2];
            return suffix ? `marker_${baseName}_${suffix}` : `marker_${baseName}`;
        }

        const flMatch = cleanName.match(/^FL_(\d+)$/);
        if (flMatch) return `flag_${flMatch[1]}`;

        const gwMatch = name.match(/^GW_"(.+?)"(?:_"(.*?)")?(?:_(.+))?$/);
        if (gwMatch?.[1]) {
            return `gateway_${gwMatch[1].replace(/\s+/g, '_')}`;
        }

        const wpMatch = cleanName.match(/^WP_(\d+)$/);
        if (wpMatch) return `waypoint_${wpMatch[1]}`;

        return cleanName;
    }

    /**
     * Получить дочерние элементы узла
     */
    private getChildren(node: AbstractMesh | TransformNode): (AbstractMesh | TransformNode)[] {
        if (node.getChildren) {
            return node.getChildren().filter(
                c => c instanceof AbstractMesh || c instanceof TransformNode
            ) as (AbstractMesh | TransformNode)[];
        }
        if (node.getChildMeshes) {
            return node.getChildMeshes();
        }
        return [];
    }
}

/**
 * Утилиты для работы с маркерами
 */
export class MarkerUtils {
    private static readonly ROLE_PRIORITY: Record<NonNullable<UserInfo['role']>, number> = {
        guest: 0,
        user: 1,
        admin: 2
    };

    /**
     * Определить тип маркера по имени
     */
    static getMarkerType(name: string): MarkerType | null {
        if (name.startsWith('MR_')) return MarkerType.MARKER;
        if (name.startsWith('FL_')) return MarkerType.FLAG;
        if (name.startsWith('GW_')) return MarkerType.GATEWAY;
        if (name.startsWith('WP_') && !name.includes('-')) return MarkerType.WAYPOINT;
        return null;
    }

    /**
     * Распарсить маркер из имени и объекта
     */
    static parseMarker(
        name: string,
        position: Vector3,
        type: MarkerType,
        floorNumber?: number,
        roomId?: string
    ): ParsedMarker | null {
        const worldPosition = position.clone();

        if (type === MarkerType.MARKER) {
            return this.parseMRMarker(name, worldPosition, floorNumber, roomId);
        }
        if (type === MarkerType.FLAG) {
            return this.parseFLMarker(name, worldPosition, floorNumber, roomId);
        }
        if (type === MarkerType.GATEWAY) {
            return this.parseGWMarker(name, worldPosition, floorNumber, roomId);
        }
        if (type === MarkerType.WAYPOINT) {
            return this.parseWPMarker(name, worldPosition, floorNumber, roomId);
        }
        return null;
    }

    private static parseMRMarker(
        name: string,
        position: Vector3,
        floorNumber?: number,
        roomId?: string
    ): ParsedMarker | null {
        const match = name.match(/^MR_"(.+?)"(?:_(\d+))?$/);
        if (!match) return null;

        const baseName = match[1];
        if (!baseName) return null;

        const suffix = match[2];
        const normalizedBase = baseName.replace(/\s+/g, '_');
        const id = suffix ? `marker_${normalizedBase}_${suffix}` : `marker_${normalizedBase}`;

        return {
            parsedMarker: id,
            id,
            type: 'marker',
            name: baseName,
            displayName: suffix ? `${baseName} ${suffix}` : baseName,
            position,
            connections: [],
            floorNumber,
            roomId,
            metadata: { suffix, number: suffix }
        };
    }

    private static parseFLMarker(
        name: string,
        position: Vector3,
        floorNumber?: number,
        roomId?: string
    ): ParsedMarker | null {
        const match = name.match(/^FL_(\d+)$/);
        if (!match?.[1]) return null;

        const number = match[1];
        const id = `flag_${number}`;

        return {
            parsedMarker: id,
            id,
            type: 'flag',
            name: `Флаг ${number}`,
            displayName: `Флаг ${number}`,
            position,
            connections: [],
            floorNumber,
            roomId,
            metadata: { number, qr: `https://example.com/flag/${number}` }
        };
    }

    private static parseGWMarker(
        name: string,
        position: Vector3,
        floorNumber?: number,
        roomId?: string
    ): ParsedMarker | null {
        const parts = this.parseGatewayNameParts(name);
        if (!parts) return null;

        const normalizedBase = parts.displayName.replace(/\s+/g, '_');
        const id = `gateway_${normalizedBase}`;

        return {
            parsedMarker: id,
            id,
            type: 'gateway',
            name: parts.displayName,
            displayName: parts.displayName,
            position,
            connections: [],
            floorNumber,
            roomId,
            metadata: {
                accessRights: parts.accessRights,
                requiredRole: parts.requiredRole
            }
        };
    }

    private static parseWPMarker(
        name: string,
        position: Vector3,
        floorNumber?: number,
        roomId?: string
    ): ParsedMarker | null {
        const match = name.match(/^WP_(\d+)$/);
        if (!match?.[1]) return null;

        const number = match[1];
        const id = `waypoint_${number}`;

        return {
            parsedMarker: id,
            id,
            type: 'waypoint',
            name: `Точка ${number}`,
            displayName: `Точка ${number}`,
            position,
            connections: [],
            floorNumber,
            roomId,
            metadata: { number }
        };
    }

    /**
     * Получить мировую позицию объекта
     */
    static getWorldPosition(obj: AbstractMesh | TransformNode): Vector3 {
        let localPos = obj.position.clone();
        let current = obj.parent;

        while (current) {
            if (current instanceof AbstractMesh || current instanceof TransformNode) {
                const matrix = current.computeWorldMatrix();
                localPos = Vector3.TransformCoordinates(localPos, matrix);
            }
            current = current.parent;
        }
        return localPos;
    }

    /**
     * Получить дочерние элементы узла
     */
    static getChildren(node: AbstractMesh | TransformNode): (AbstractMesh | TransformNode)[] {
        if (node.getChildren) {
            return node.getChildren().filter(
                c => c instanceof AbstractMesh || c instanceof TransformNode
            ) as (AbstractMesh | TransformNode)[];
        }
        if (node.getChildMeshes) {
            return node.getChildMeshes();
        }
        return [];
    }

    /**
     * Получить номер этажа объекта
     */
    static getFloorNumber(
        obj: AbstractMesh | TransformNode,
        floorNodeMap: Map<AbstractMesh | TransformNode, number>,
        cache: Map<AbstractMesh | TransformNode, number | undefined>
    ): number | undefined {
        if (cache.has(obj)) return cache.get(obj);

        if (floorNodeMap.has(obj)) {
            const floor = floorNodeMap.get(obj);
            cache.set(obj, floor);
            return floor;
        }

        let parent = obj.parent;
        while (parent) {
            if ((parent instanceof AbstractMesh || parent instanceof TransformNode) && floorNodeMap.has(parent)) {
                const floor = floorNodeMap.get(parent);
                cache.set(obj, floor);
                return floor;
            }
            parent = parent.parent;
        }

        cache.set(obj, undefined);
        return undefined;
    }

    /**
     * Извлечь отображаемое имя комнаты
     */
    static extractRoomDisplayName(name: string): string {
        const match = name.match(/Room_(\d+)(?:_(guest|user|admin))?/i);
        if (match?.[1]) return `Комната ${parseInt(match[1], 10)}`;
        return name;
    }

    static extractRoomRequiredRole(name: string): UserInfo['role'] {
        const match = name.match(/Room_(\d+)(?:_(guest|user|admin))?/i);
        return this.normalizeRole(match?.[2]);
    }

    static extractFloorRequiredRole(name: string): UserInfo['role'] {
        const match = name.match(/Floor_(\d+)(?:_(guest|user|admin))?/i);
        return this.normalizeRole(match?.[2]);
    }

    /**
     * Проверить, является ли объект маркером
     */
    static isMarker(name: string): boolean {
        return name.startsWith('MR_') || name.startsWith('FL_') || name.startsWith('GW_') || name.startsWith('WP_');
    }

    /**
     * Проверить, является ли объект комнатой
     */
    static isRoom(name: string): boolean {
        return name.startsWith('Room_');
    }

    /**
     * Проверить, является ли объект узлом соединения
     */
    static isConnectionNode(name: string): boolean {
        return name === 'Connections' || (name.includes('-') && !this.isMarker(name));
    }

    private static parseGatewayNameParts(name: string): {
        displayName: string;
        accessRights: string[];
        requiredRole: NonNullable<UserInfo['role']>;
    } | null {
        const match = name.match(/^GW_"(.+?)"(?:_(guest|user|admin))?$/i);
        if (!match?.[1]) return null;

        const displayName = match[1].trim();
        const requiredRole = this.normalizeRole(match[2]) ?? 'admin';
        const accessRights = this.expandRoleRights(requiredRole);

        return { displayName, accessRights, requiredRole };
    }

    static normalizeRole(role?: string): UserInfo['role'] {
        const normalized = role?.trim().toLowerCase();
        if (normalized === 'guest' || normalized === 'user' || normalized === 'admin') {
            return normalized;
        }
        return undefined;
    }

    static expandRoleRights(role: NonNullable<UserInfo['role']>): string[] {
        return (Object.keys(this.ROLE_PRIORITY) as NonNullable<UserInfo['role']>[])
            .filter(candidate => this.ROLE_PRIORITY[candidate] >= this.ROLE_PRIORITY[role]);
    }

    static hasRequiredRole(userRole: UserInfo['role'] | undefined, requiredRole: UserInfo['role'] | undefined): boolean {
        if (!requiredRole) return true;

        const currentLevel = this.ROLE_PRIORITY[userRole ?? 'guest'] ?? this.ROLE_PRIORITY.guest;
        const requiredLevel = this.ROLE_PRIORITY[requiredRole] ?? this.ROLE_PRIORITY.admin;
        return currentLevel >= requiredLevel;
    }
}
