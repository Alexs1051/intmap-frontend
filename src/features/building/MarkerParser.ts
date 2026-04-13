import { AbstractMesh, TransformNode } from "@babylonjs/core";
import { injectable } from "inversify";
import { ParsedMarker, ParsedRoom } from "../../shared/types";
import { ConnectionParser, MarkerUtils } from './ConnectionParser';

/**
 * Парсер маркеров и комнат из иерархии сцены
 * Использует ConnectionParser для соединений и MarkerUtils для парсинга
 */
@injectable()
export class MarkerParser {
    private connectionParser: ConnectionParser;

    constructor() {
        this.connectionParser = new ConnectionParser();
    }

    /**
     * Распарсить маркеры и комнаты из объектов сцены
     */
    public parseMarkersAndRooms(
        objects: (AbstractMesh | TransformNode)[],
        floorNodeMap: Map<AbstractMesh | TransformNode, number>
    ): { markers: Map<string, ParsedMarker>; rooms: Map<string, ParsedRoom> } {
        const floorCache = new Map<AbstractMesh | TransformNode, number | undefined>();
        const markers = new Map<string, ParsedMarker>();
        const rooms = new Map<string, ParsedRoom>();

        // Парсим иерархию (маркеры и комнаты)
        this.parseHierarchy(objects, { markers, rooms, floorNodeMap, floorCache });

        // Парсим соединения и применяем к маркерам
        const connections = this.connectionParser.parse(objects);
        this.connectionParser.applyToMarkers(markers, connections);

        return { markers, rooms };
    }

    /**
     * Распарсить иерархию объектов
     */
    private parseHierarchy(
        objects: (AbstractMesh | TransformNode)[],
        context: {
            markers: Map<string, ParsedMarker>;
            rooms: Map<string, ParsedRoom>;
            floorNodeMap: Map<AbstractMesh | TransformNode, number>;
            floorCache: Map<AbstractMesh | TransformNode, number | undefined>;
        },
        parentRoom?: string
    ): void {
        for (const obj of objects) {
            const name = obj.name;

            // Пропускаем узлы соединений
            if (MarkerUtils.isConnectionNode(name)) {
                continue;
            }

            const floorNumber = MarkerUtils.getFloorNumber(obj, context.floorNodeMap, context.floorCache);

            // Обрабатываем комнаты
            if (MarkerUtils.isRoom(name)) {
                this.processRoom(obj, name, floorNumber, context);
                continue;
            }

            // Парсим маркеры
            const markerType = MarkerUtils.getMarkerType(name);
            if (markerType) {
                this.processMarker(obj, name, markerType, floorNumber, context, parentRoom);
            }

            // Рекурсивно обрабатываем детей
            const children = MarkerUtils.getChildren(obj);
            if (children.length > 0) {
                this.parseHierarchy(children, context, parentRoom);
            }
        }
    }

    /**
     * Обработать комнату
     */
    private processRoom(
        obj: AbstractMesh | TransformNode,
        name: string,
        floorNumber: number | undefined,
        context: {
            markers: Map<string, ParsedMarker>;
            rooms: Map<string, ParsedRoom>;
            floorNodeMap: Map<AbstractMesh | TransformNode, number>;
            floorCache: Map<AbstractMesh | TransformNode, number | undefined>;
        }
    ): void {
        if (context.rooms.has(name)) {
            // Комната уже существует, обрабатываем детей
            const children = MarkerUtils.getChildren(obj);
            if (children.length > 0) {
                this.parseHierarchy(children, context, name);
            }
            return;
        }

        const room: ParsedRoom = {
            id: name,
            name,
            displayName: MarkerUtils.extractRoomDisplayName(name),
            walls: [],
            markers: [],
            position: obj.position.clone(),
            floorNumber
        };
        context.rooms.set(name, room);

        const children = MarkerUtils.getChildren(obj);
        if (children.length > 0) {
            this.parseHierarchy(children, context, name);
        }
    }

    /**
     * Обработать маркер
     */
    private processMarker(
        obj: AbstractMesh | TransformNode,
        name: string,
        type: ReturnType<typeof MarkerUtils.getMarkerType>,
        floorNumber: number | undefined,
        context: {
            markers: Map<string, ParsedMarker>;
            rooms: Map<string, ParsedRoom>;
        },
        parentRoom?: string
    ): void {
        if (!type) return;

        const worldPosition = MarkerUtils.getWorldPosition(obj);
        const marker = MarkerUtils.parseMarker(name, worldPosition, type, floorNumber, parentRoom);

        if (marker) {
            context.markers.set(marker.id, marker);

            if (parentRoom) {
                const room = context.rooms.get(parentRoom);
                if (room && !room.markers.includes(marker.id)) {
                    room.markers.push(marker.id);
                }
            }
        }
    }
}
