import { Vector3 } from "@babylonjs/core";
import { Marker } from "../Marker";
import { ConnectionDirection, GraphNode, GraphEdge, PathResult } from "../types";
import { logger } from "../../../core/logger/Logger";

const graphLogger = logger.getLogger('MarkerGraph');

export class MarkerGraph {
  private _nodes: Map<string, GraphNode> = new Map();
  private _edges: Map<string, GraphEdge> = new Map();
  private _markers: Map<string, Marker> = new Map();

  /**
   * Добавить маркер в граф
   */
  public addNode(marker: Marker): void {
    if (this._nodes.has(marker.id)) {
      graphLogger.warn(`Маркер ${marker.id} уже существует в графе`);
      return;
    }

    this._markers.set(marker.id, marker);
    this._nodes.set(marker.id, {
      markerId: marker.id,
      connections: new Map()
    });

    graphLogger.debug(`Добавлен узел: ${marker.id} (${marker.data.name})`);
  }

  /**
   * Добавить связь между маркерами
   */
  public addConnection(
    fromId: string,
    toId: string,
    direction: ConnectionDirection,
    weight?: number
  ): boolean {
    const fromNode = this._nodes.get(fromId);
    const toNode = this._nodes.get(toId);
    const fromMarker = this._markers.get(fromId);
    const toMarker = this._markers.get(toId);

    if (!fromNode || !toNode || !fromMarker || !toMarker) {
      graphLogger.warn(`Не удалось создать связь: узлы не найдены`);
      return false;
    }

    const fromPos = fromMarker.position;
    const toPos = toMarker.position;
    const distance = Vector3.Distance(fromPos, toPos);

    const edgeId = `${fromId}->${toId}`;
    const edge: GraphEdge = {
      from: fromId,
      to: toId,
      direction,
      weight: weight || distance,
      distance
    };

    this._edges.set(edgeId, edge);
    fromNode.connections.set(toId, edge);

    if (direction === ConnectionDirection.TWO_WAY) {
      const reverseEdgeId = `${toId}->${fromId}`;
      const reverseEdge: GraphEdge = {
        from: toId,
        to: fromId,
        direction,
        weight: weight || distance,
        distance
      };
      this._edges.set(reverseEdgeId, reverseEdge);
      toNode.connections.set(fromId, reverseEdge);
    }

    graphLogger.debug(`Добавлена связь: ${fromId} -> ${toId} (${direction})`);
    return true;
  }

  /**
   * Добавить связи из данных маркера
   */
  public addConnectionsFromMarker(marker: Marker): void {
    const connections = marker.data.connections;
    if (!connections) return;

    connections.forEach(conn => {
      this.addConnection(
        conn.fromId,
        conn.toId,
        conn.direction,
        conn.weight
      );
    });
  }

  /**
   * Найти путь между двумя маркерами (алгоритм Дейкстры)
   */
  public findPath(startId: string, endId: string): PathResult | null {
    if (!this._nodes.has(startId) || !this._nodes.has(endId)) {
      graphLogger.warn(`Не удалось найти путь: узлы не найдены`);
      return null;
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const unvisited = new Set<string>();

    this._nodes.forEach((_, id) => {
      distances.set(id, id === startId ? 0 : Infinity);
      unvisited.add(id);
    });

    while (unvisited.size > 0) {
      let current: string | null = null;
      let minDist = Infinity;

      unvisited.forEach(id => {
        const dist = distances.get(id) || Infinity;
        if (dist < minDist) {
          minDist = dist;
          current = id;
        }
      });

      if (!current) break;
      if (current === endId) break;
      if (minDist === Infinity) break;

      unvisited.delete(current);

      const currentNode = this._nodes.get(current);
      if (currentNode) {
        currentNode.connections.forEach((edge, neighborId) => {
          if (unvisited.has(neighborId)) {
            const newDist = minDist + edge.weight;
            const currentDist = distances.get(neighborId) || Infinity;

            if (newDist < currentDist) {
              distances.set(neighborId, newDist);
              previous.set(neighborId, current);
            }
          }
        });
      }
    }

    const pathIds: string[] = [];
    let current = endId;

    while (current) {
      pathIds.unshift(current);
      current = previous.get(current) || '';
    }

    if (pathIds.length === 0 || pathIds[0] !== startId) {
      graphLogger.warn(`Путь от ${startId} до ${endId} не найден`);
      return null;
    }

    const path: Marker[] = [];
    for (const id of pathIds) {
      const marker = this._markers.get(id);
      if (marker) {
        path.push(marker);
      } else {
        graphLogger.warn(`Маркер ${id} не найден в хранилище`);
        return null;
      }
    }

    const result: PathResult = {
      path,
      pathIds,
      totalDistance: distances.get(endId) || 0,
      nodesVisited: pathIds.length
    };

    graphLogger.debug(`Найден путь от ${startId} до ${endId}: ${pathIds.length} узлов, расстояние ${result.totalDistance.toFixed(2)}`);
    return result;
  }

  /**
   * Получить все маркеры, связанные с данным
   */
  public getNeighbors(markerId: string): Marker[] {
    const node = this._nodes.get(markerId);
    if (!node) {
      graphLogger.warn(`Узел ${markerId} не найден в графе`);
      return [];
    }

    graphLogger.debug(`Соседи узла ${markerId} (connections: ${node.connections.size}):`);
    
    const neighbors: Marker[] = [];
    node.connections.forEach((edge, neighborId) => {
      graphLogger.debug(`  → Ребро: ${edge.from} -> ${edge.to} (${edge.direction})`);
      const neighborMarker = this._markers.get(neighborId);
      if (neighborMarker) {
        neighbors.push(neighborMarker);
        graphLogger.debug(`    ✅ Найден сосед: ${neighborMarker.name}`);
      } else {
        graphLogger.warn(`    ❌ Маркер ${neighborId} не найден в хранилище`);
      }
    });

    return neighbors;
  }

  /**
   * Проверить, существует ли связь между маркерами
   */
  public hasConnection(fromId: string, toId: string): boolean {
    const fromNode = this._nodes.get(fromId);
    return fromNode?.connections.has(toId) || false;
  }

  /**
   * Удалить маркер из графа
   */
  public removeNode(markerId: string): boolean {
    if (!this._nodes.has(markerId)) return false;

    this._nodes.forEach((node, id) => {
      if (node.connections.has(markerId)) {
        node.connections.delete(markerId);
        this._edges.delete(`${id}->${markerId}`);
        this._edges.delete(`${markerId}->${id}`);
      }
    });

    this._nodes.delete(markerId);
    this._markers.delete(markerId);
    graphLogger.debug(`Удалён узел: ${markerId}`);
    return true;
  }

  /**
   * Получить все маркеры
   */
  public getAllMarkers(): Marker[] {
    return Array.from(this._markers.values());
  }

  /**
   * Получить маркеры по типу
   */
  public getMarkersByType(type: string): Marker[] {
    return this.getAllMarkers().filter(m => m.type === type);
  }

  /**
   * Получить маркер по ID
   */
  public getMarker(id: string): Marker | undefined {
    return this._markers.get(id);
  }

  /**
   * Получить все рёбра
   */
  public getAllEdges(): GraphEdge[] {
    return Array.from(this._edges.values());
  }

  /**
   * Получить количество узлов
   */
  public get nodeCount(): number {
    return this._nodes.size;
  }

  /**
   * Получить количество связей
   */
  public get edgeCount(): number {
    return this._edges.size;
  }

  public debugNeighbors(markerId: string): void {
    const marker = this.getMarker(markerId);
    if (!marker) {
      graphLogger.warn(`Маркер ${markerId} не найден`);
      return;
    }

    graphLogger.info(`Соседи маркера ${marker.name} (${markerId}):`);
    
    const neighbors = this.getNeighbors(markerId);
    
    if (neighbors.length === 0) {
      graphLogger.warn(`  ⚠️ Нет соседей!`);
      return;
    }

    neighbors.forEach(neighbor => {
      const dist = Vector3.Distance(marker.position, neighbor.position);
      graphLogger.info(`  → ${neighbor.name} (${neighbor.id}), расстояние: ${dist.toFixed(2)}м`);
    });
  }

  /**
   * Получить ID соседей узла
   */
  private getNeighborIds(nodeId: string): string[] {
    const node = this._nodes.get(nodeId);
    if (!node) return [];
    return Array.from(node.connections.keys());
  }

  /**
   * Проверить, связный ли граф (BFS от стартового узла)
   */
  public isReachable(startId: string, endId: string): boolean {
    if (!this._nodes.has(startId) || !this._nodes.has(endId)) {
      return false;
    }

    const visited = new Set<string>();
    const queue: string[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === endId) {
        return true;
      }

      const neighbors = this.getNeighborIds(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  /**
   * Получить все узлы, достижимые из стартового
   */
  public getReachableNodes(startId: string): string[] {
    if (!this._nodes.has(startId)) {
      return [];
    }

    const visited = new Set<string>();
    const queue: string[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.getNeighborIds(current);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return Array.from(visited);
  }

  /**
   * Найти путь через BFS (для отладки)
   */
  public bfsPath(startId: string, endId: string): string[] | null {
    if (!this._nodes.has(startId) || !this._nodes.has(endId)) return null;
    
    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];
    const visited = new Set<string>([startId]);
    
    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      
      if (id === endId) {
        return path;
      }
      
      const neighbors = this.getNeighborIds(id);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, path: [...path, neighbor] });
        }
      }
    }
    
    return null;
  }
}