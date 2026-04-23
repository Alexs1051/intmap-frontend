import { AbstractMesh, TransformNode } from "@babylonjs/core";
import { ParsedMarker } from "@shared/types";

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
