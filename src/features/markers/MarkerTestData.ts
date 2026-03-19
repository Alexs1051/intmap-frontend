import { Vector3 } from "@babylonjs/core";
import { 
  MarkerData, 
  FlagData, 
  WaypointData, 
  MarkerType, 
  ConnectionDirection,
  AnyMarkerData,
  RGBA
} from "./types";
import { getHarmoniousTextColor } from "./utils/iconUtils";

// Импортируем описания из md файлов
import entranceDescription from './descriptions/entrance.md';
import elevatorDescription from './descriptions/elevator.md';
import conferenceDescription from './descriptions/conference.md';

export class MarkerTestData {
  /**
   * Создать гармоничный цвет текста на основе фона
   */
  private static getTextColor(bgColor: RGBA): RGBA {
    return getHarmoniousTextColor(bgColor);
  }

  /**
   * Создать тестовые вейпоинты, образующие единую навигационную сеть
   */
  public static createWaypoints(): WaypointData[] {
    const waypoints: WaypointData[] = [];
    
    // Основной цвет для вейпоинтов (красный с прозрачностью)
    const bgColor: RGBA = { r: 0.8, g: 0.2, b: 0.2, a: 0.9 };
    const textColor = this.getTextColor(bgColor);
    
    // === 1. Внешний многоугольник (8 вершин) ===
    const outerRadius = 25;
    const outerCount = 8;
    
    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2;
      const x = Math.cos(angle) * outerRadius;
      const z = Math.sin(angle) * outerRadius;
      const pos = new Vector3(x, 0, z);
      
      waypoints.push({
        id: `wp_outer_${i + 1}`,
        type: MarkerType.WAYPOINT,
        position: pos,
        name: `outer_${i + 1}`,
        iconName: i % 2 === 0 ? 'trip_origin' : 'fiber_manual_record',
        backgroundColor: bgColor,
        textColor: textColor,
        floor: 1,
        connections: []
      });
    }
    
    // === 2. Внутренний многоугольник (6 вершин) ===
    const innerRadius = 12;
    const innerCount = 6;
    
    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2;
      const x = Math.cos(angle) * innerRadius;
      const z = Math.sin(angle) * innerRadius;
      const pos = new Vector3(x, 0, z);
      
      waypoints.push({
        id: `wp_inner_${i + 1}`,
        type: MarkerType.WAYPOINT,
        position: pos,
        name: `inner_${i + 1}`,
        iconName: i % 2 === 0 ? 'trip_origin' : 'fiber_manual_record',
        backgroundColor: bgColor,
        textColor: textColor,
        floor: 1,
        connections: []
      });
    }
    
    // === 3. Дополнительные точки (12 шт) ===
    const extraPoints = [
      new Vector3(5, 0, 5),
      new Vector3(-5, 0, 5),
      new Vector3(5, 0, -5),
      new Vector3(-5, 0, -5),
      new Vector3(8, 0, 8),
      new Vector3(-8, 0, 8),
      new Vector3(8, 0, -8),
      new Vector3(-8, 0, -8),
      new Vector3(0, 0, 10),
      new Vector3(10, 0, 0),
      new Vector3(-10, 0, 0),
      new Vector3(0, 0, -10),
      new Vector3(15, 0, 0),
      new Vector3(0, 0, 15),
      new Vector3(-15, 0, 0),
      new Vector3(0, 0, -15)
    ];
    
    extraPoints.forEach((pos, index) => {
      waypoints.push({
        id: `wp_extra_${index + 1}`,
        type: MarkerType.WAYPOINT,
        position: pos,
        name: `extra_${index + 1}`,
        iconName: 'fiber_manual_record',
        backgroundColor: bgColor,
        textColor: textColor,
        floor: 1,
        connections: []
      });
    });

    // === 4. Создаём связи для образования связного графа ===
    
    // Связываем внешние точки в кольцо
    for (let i = 0; i < outerCount; i++) {
      const current = waypoints[i];
      const next = waypoints[(i + 1) % outerCount];
      const prev = waypoints[(i - 1 + outerCount) % outerCount];
      
      // Добавляем связи, если их ещё нет
      if (!current.connections.some(c => c.toId === next.id)) {
        current.connections.push({
          fromId: current.id,
          toId: next.id,
          direction: ConnectionDirection.TWO_WAY
        });
      }
      
      if (!current.connections.some(c => c.toId === prev.id)) {
        current.connections.push({
          fromId: current.id,
          toId: prev.id,
          direction: ConnectionDirection.TWO_WAY
        });
      }
    }
    
    // Связываем внутренние точки в кольцо
    for (let i = 0; i < innerCount; i++) {
      const current = waypoints[outerCount + i];
      const next = waypoints[outerCount + ((i + 1) % innerCount)];
      const prev = waypoints[outerCount + ((i - 1 + innerCount) % innerCount)];
      
      if (!current.connections.some(c => c.toId === next.id)) {
        current.connections.push({
          fromId: current.id,
          toId: next.id,
          direction: ConnectionDirection.TWO_WAY
        });
      }
      
      if (!current.connections.some(c => c.toId === prev.id)) {
        current.connections.push({
          fromId: current.id,
          toId: prev.id,
          direction: ConnectionDirection.TWO_WAY
        });
      }
    }
    
    // Соединяем внешние точки с внутренними (каждая внешняя с 2 внутренними)
    for (let i = 0; i < outerCount; i++) {
      const outer = waypoints[i];
      
      // Находим 2 ближайшие внутренние точки
      const distances: { index: number; dist: number }[] = [];
      
      for (let j = 0; j < innerCount; j++) {
        const inner = waypoints[outerCount + j];
        const dist = Vector3.Distance(outer.position, inner.position);
        distances.push({ index: j, dist });
      }
      
      distances.sort((a, b) => a.dist - b.dist);
      
      // Берём 2 ближайшие
      for (let k = 0; k < 2; k++) {
        const inner = waypoints[outerCount + distances[k].index];
        if (!outer.connections.some(c => c.toId === inner.id)) {
          outer.connections.push({
            fromId: outer.id,
            toId: inner.id,
            direction: ConnectionDirection.TWO_WAY
          });
        }
      }
    }
    
    // Соединяем все дополнительные точки с ближайшими из основного графа
    const totalMain = outerCount + innerCount;
    for (let i = totalMain; i < waypoints.length; i++) {
      const extra = waypoints[i];
      const distances: { id: string; dist: number }[] = [];
      
      // Сравниваем со всеми основными точками
      for (let j = 0; j < totalMain; j++) {
        const other = waypoints[j];
        const dist = Vector3.Distance(extra.position, other.position);
        distances.push({ id: other.id, dist });
      }
      
      distances.sort((a, b) => a.dist - b.dist);
      
      // Соединяем с 3 ближайшими основными точками
      for (let k = 0; k < 3; k++) {
        if (!extra.connections.some(c => c.toId === distances[k].id)) {
          extra.connections.push({
            fromId: extra.id,
            toId: distances[k].id,
            direction: ConnectionDirection.TWO_WAY
          });
        }
      }
    }
    
    // Добавляем дополнительные связи между соседними дополнительными точками
    for (let i = totalMain; i < waypoints.length; i++) {
      for (let j = i + 1; j < waypoints.length; j++) {
        const wp1 = waypoints[i];
        const wp2 = waypoints[j];
        const dist = Vector3.Distance(wp1.position, wp2.position);
        
        // Если точки достаточно близко, связываем их
        if (dist < 12) {
          if (!wp1.connections.some(c => c.toId === wp2.id)) {
            wp1.connections.push({
              fromId: wp1.id,
              toId: wp2.id,
              direction: ConnectionDirection.TWO_WAY
            });
          }
        }
      }
    }

    // Гарантируем связность графа - соединяем внешние точки в полное кольцо
    for (let i = 0; i < outerCount; i++) {
      const current = waypoints[i];
      const next = waypoints[(i + 1) % outerCount];
      
      if (!current.connections.some(c => c.toId === next.id)) {
        current.connections.push({
          fromId: current.id,
          toId: next.id,
          direction: ConnectionDirection.TWO_WAY
        });
      }
    }

    // Соединяем внутренние точки с внешними
    for (let i = 0; i < innerCount; i++) {
      const inner = waypoints[outerCount + i];
      
      // Находим 3 ближайшие внешние точки
      const distances: { id: string; dist: number }[] = [];
      for (let j = 0; j < outerCount; j++) {
        const outer = waypoints[j];
        const dist = Vector3.Distance(inner.position, outer.position);
        distances.push({ id: outer.id, dist });
      }
      
      distances.sort((a, b) => a.dist - b.dist);
      
      // Соединяем с 3 ближайшими
      for (let k = 0; k < 3; k++) {
        if (!inner.connections.some(c => c.toId === distances[k].id)) {
          inner.connections.push({
            fromId: inner.id,
            toId: distances[k].id,
            direction: ConnectionDirection.TWO_WAY
          });
        }
      }
    }

    return waypoints;
  }

  /**
   * Создать тестовые маркеры (6 шт) на высоте 5
   * Каждый маркер связан с ближайшим вейпоинтом
   */
  public static createMarkers(waypoints: WaypointData[]): MarkerData[] {
    const baseHeight = 5;
    
    // Зеленый для входов
    const entranceBg: RGBA = { r: 0.2, g: 0.6, b: 0.3, a: 0.9 };
    const entranceText = this.getTextColor(entranceBg);
    
    // Красный для лифтов
    const elevatorBg: RGBA = { r: 0.8, g: 0.3, b: 0.2, a: 0.9 };
    const elevatorText = this.getTextColor(elevatorBg);
    
    // Оранжевый для кафе
    const cafeBg: RGBA = { r: 0.9, g: 0.6, b: 0.2, a: 0.9 };
    const cafeText = this.getTextColor(cafeBg);
    
    // Синий для информации
    const infoBg: RGBA = { r: 0.2, g: 0.4, b: 0.8, a: 0.9 };
    const infoText = this.getTextColor(infoBg);
    
    // Позиции маркеров
    const markerPositions = [
      new Vector3(-20, baseHeight, -20), // entrance-1
      new Vector3(20, baseHeight, 20),   // entrance-2
      new Vector3(-10, baseHeight, 0),   // elevator-1
      new Vector3(10, baseHeight, 0),    // elevator-2
      new Vector3(-15, baseHeight, 15),  // cafe
      new Vector3(15, baseHeight, -15)   // info
    ];
    
    const markers: MarkerData[] = [];
    
    markerPositions.forEach((pos, index) => {
      const closest = this.findClosestWaypoint(pos, waypoints);
      
      switch(index) {
        case 0:
          markers.push({
            id: "entrance-1",
            type: MarkerType.MARKER,
            position: pos,
            name: "СЕВЕРНЫЙ ВХОД",
            description: entranceDescription,
            iconName: 'door_front',
            backgroundColor: entranceBg,
            textColor: entranceText,
            floor: 3,
            connections: [
              { fromId: "entrance-1", toId: closest.id, direction: ConnectionDirection.TWO_WAY }
            ]
          });
          break;
        case 1:
          markers.push({
            id: "entrance-2",
            type: MarkerType.MARKER,
            position: pos,
            name: "ЮЖНЫЙ ВХОД",
            description: entranceDescription,
            iconName: 'door_front',
            backgroundColor: entranceBg,
            textColor: entranceText,
            floor: 3,
            connections: [
              { fromId: "entrance-2", toId: closest.id, direction: ConnectionDirection.TWO_WAY }
            ]
          });
          break;
        case 2:
          markers.push({
            id: "elevator-1",
            type: MarkerType.MARKER,
            position: pos,
            name: "ЛИФТ A",
            description: elevatorDescription,
            iconName: 'elevator',
            backgroundColor: elevatorBg,
            textColor: elevatorText,
            floor: 5,
            connections: [
              { fromId: "elevator-1", toId: closest.id, direction: ConnectionDirection.TWO_WAY }
            ]
          });
          break;
        case 3:
          markers.push({
            id: "elevator-2",
            type: MarkerType.MARKER,
            position: pos,
            name: "ЛИФТ B",
            description: elevatorDescription,
            iconName: 'elevator',
            backgroundColor: elevatorBg,
            textColor: elevatorText,
            floor: 5,
            connections: [
              { fromId: "elevator-2", toId: closest.id, direction: ConnectionDirection.TWO_WAY }
            ]
          });
          break;
        case 4:
          markers.push({
            id: "cafe",
            type: MarkerType.MARKER,
            position: pos,
            name: "КАФЕ",
            description: "Уютное кафе\n\n*Wi-Fi*\n*Кофе*\n*Выпечка*",
            iconName: 'local_cafe',
            backgroundColor: cafeBg,
            textColor: cafeText,
            floor: 3,
            connections: [
              { fromId: "cafe", toId: closest.id, direction: ConnectionDirection.TWO_WAY }
            ]
          });
          break;
        case 5:
          markers.push({
            id: "info",
            type: MarkerType.MARKER,
            position: pos,
            name: "ИНФОРМАЦИЯ",
            description: "Стойка информации и регистрации",
            iconName: 'info',
            backgroundColor: infoBg,
            textColor: infoText,
            floor: 3,
            connections: [
              { fromId: "info", toId: closest.id, direction: ConnectionDirection.TWO_WAY }
            ]
          });
          break;
      }
    });
    
    return markers;
  }

  /**
   * Создать тестовые флаги (3 шт) на высоте 5
   */
  public static createFlags(waypoints: WaypointData[]): FlagData[] {
    const baseHeight = 5;
    
    // Синий для флагов
    const flagBg: RGBA = { r: 0.2, g: 0.3, b: 0.8, a: 0.9 };
    const flagText = this.getTextColor(flagBg);
    
    // Позиции флагов
    const flagPositions = [
      new Vector3(-5, baseHeight, -5),
      new Vector3(5, baseHeight, 5),
      new Vector3(0, baseHeight, 0)
    ];
    
    const flags: FlagData[] = [];
    
    flagPositions.forEach((pos, index) => {
      const closest = this.findClosestWaypoint(pos, waypoints);
      flags.push({
        id: `flag-${index + 1}`,
        type: MarkerType.FLAG,
        position: pos,
        name: `fl_0${index + 1}`,
        iconName: 'flag',
        backgroundColor: flagBg,
        textColor: flagText,
        qr: `https://example.com/flag${index + 1}`,
        floor: 3,
        connections: [
          { fromId: `flag-${index + 1}`, toId: closest.id, direction: ConnectionDirection.TWO_WAY }
        ]
      });
    });
    
    return flags;
  }

  /**
   * Найти ближайший вейпоинт к заданной позиции
   */
  private static findClosestWaypoint(position: Vector3, waypoints: WaypointData[]): WaypointData {
    let minDist = Infinity;
    let closest: WaypointData | null = null;
    
    for (const wp of waypoints) {
      const dist = Vector3.Distance(position, wp.position);
      if (dist < minDist) {
        minDist = dist;
        closest = wp;
      }
    }
    
    return closest!;
  }

  /**
   * Создать все тестовые данные
   */
  public static createAll(): AnyMarkerData[] {
    const waypoints = this.createWaypoints();
    const markers = this.createMarkers(waypoints);
    const flags = this.createFlags(waypoints);
    
    return [...waypoints, ...markers, ...flags];
  }

  /**
   * Получить статистику по тестовым данным
   */
  public static getStats(): {
    total: number;
    waypoints: number;
    markers: number;
    flags: number;
    connections: number;
  } {
    const waypoints = this.createWaypoints();
    const markers = this.createMarkers(waypoints);
    const flags = this.createFlags(waypoints);
    
    const connections = [...waypoints, ...markers, ...flags].reduce(
      (sum, marker) => sum + (marker.connections?.length || 0), 
      0
    );
    
    return {
      total: waypoints.length + markers.length + flags.length,
      waypoints: waypoints.length,
      markers: markers.length,
      flags: flags.length,
      connections
    };
  }
}