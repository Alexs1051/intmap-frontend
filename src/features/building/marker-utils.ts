import { AbstractMesh, TransformNode, Vector3 } from "@babylonjs/core";
import { ParsedMarker, MarkerType, UserInfo } from "@shared/types";
import { getCurrentBuildingRef, getQueryParam } from "@shared/utils/url.utils";

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
        const qr = this.buildFlagQrValue(id);

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
            metadata: { number, qr }
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

    private static buildFlagQrValue(flagId: string): string {
        const buildingRef = getCurrentBuildingRef() ?? getQueryParam('b') ?? 'building';
        const encodedBuildingRef = encodeURIComponent(buildingRef);
        const encodedFlagId = encodeURIComponent(flagId);

        if (typeof window !== 'undefined' && typeof window.location?.origin === 'string' && window.location.origin) {
            return `${window.location.origin}/?b=${encodedBuildingRef}&f=${encodedFlagId}`;
        }

        return `intmap://flag/${buildingRef}/${flagId}`;
    }
}
