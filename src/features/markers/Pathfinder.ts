import { Vector3 } from "@babylonjs/core";
import { MarkerGraph } from "./graph/MarkerGraph";
import { Marker } from "./Marker";
import { logger } from "../../core/logger/Logger";

const pathfinderLogger = logger.getLogger('Pathfinder');

export interface PathResult {
  path: Marker[];
  totalDistance: number;
  nodesVisited: number;
}

export class Pathfinder {
  private _graph: MarkerGraph;

  constructor(graph: MarkerGraph) {
    this._graph = graph;
  }

  /**
   * Найти кратчайший путь между двумя маркерами (алгоритм Дейкстры)
   */
  public findShortestPath(startId: string, endId: string): PathResult | null {
    pathfinderLogger.debug(`🔍 Поиск пути от ${startId} до ${endId}`);

    const startMarker = this._graph.getMarker(startId);
    const endMarker = this._graph.getMarker(endId);

    if (!startMarker || !endMarker) {
      pathfinderLogger.warn('❌ Начальный или конечный маркер не найден');
      return null;
    }

    pathfinderLogger.info(`📌 От: ${startMarker.name} (${startId})`);
    pathfinderLogger.info(`📌 До: ${endMarker.name} (${endId})`);

    // Инициализация
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    const queue: string[] = [startId];

    distances.set(startId, 0);

    pathfinderLogger.debug(`📊 Начинаем BFS/Дейкстру от ${startMarker.name}`);

    while (queue.length > 0) {
      // Сортируем очередь по расстоянию (как в Дейкстре)
      queue.sort((a, b) => (distances.get(a) || Infinity) - (distances.get(b) || Infinity));
      
      const current = queue.shift()!;
      
      if (visited.has(current)) continue;
      visited.add(current);

      const currentNode = this._graph.getMarker(current)!;
      const currentDist = distances.get(current) || 0;

      pathfinderLogger.debug(`📍 Текущий узел: ${currentNode.name} (${current}), расстояние: ${currentDist.toFixed(2)}`);

      if (current === endId) {
        pathfinderLogger.debug(`✅ Достигнут целевой узел`);
        break;
      }

      const neighbors = this._graph.getNeighbors(current);
      
      neighbors.forEach(neighbor => {
        if (visited.has(neighbor.id)) return;

        const edgeWeight = Vector3.Distance(currentNode.position, neighbor.position);
        const newDist = currentDist + edgeWeight;
        const oldDist = distances.get(neighbor.id) || Infinity;

        pathfinderLogger.debug(`  → Сосед: ${neighbor.name}, вес: ${edgeWeight.toFixed(2)}, новое расстояние: ${newDist.toFixed(2)}`);

        if (newDist < oldDist) {
          distances.set(neighbor.id, newDist);
          previous.set(neighbor.id, current);
          queue.push(neighbor.id);
          pathfinderLogger.debug(`    ✅ Добавлен в очередь: ${neighbor.name}`);
        }
      });
    }

    // Проверяем, найден ли путь
    if (!distances.has(endId) || distances.get(endId) === Infinity) {
      pathfinderLogger.warn(`❌ Путь не найден`);
      return null;
    }

    // Восстанавливаем путь
    const path: Marker[] = [];
    let current = endId;

    while (current) {
      const marker = this._graph.getMarker(current);
      if (!marker) break;
      path.unshift(marker);
      current = previous.get(current) || '';
    }

    const result: PathResult = {
      path,
      totalDistance: distances.get(endId) || 0,
      nodesVisited: path.length
    };

    pathfinderLogger.info(`✅ Найден путь: ${path.map(m => m.name).join(' → ')}`);
    return result;
  }
}