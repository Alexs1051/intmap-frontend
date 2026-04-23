import { AbstractMesh, TransformNode, StandardMaterial, PBRMaterial, Vector3 } from "@babylonjs/core";
import { ElementType } from "@shared/types/enum/building.enum";
import { UserInfo } from "./ui.dto";

/**
 * Элемент здания (стена, пол, окно, дверь и т.д.)
 */
export interface BuildingElement {
    /** Уникальное имя элемента */
    name: string;
    /** Ссылка на 3D меш в сцене */
    mesh: AbstractMesh;
    /** Тип элемента (стена, пол, окно и т.д.) */
    type: ElementType;
    /** Номер этажа, к которому относится элемент */
    floorNumber?: number;
    /** Видим ли элемент в данный момент */
    isVisible: boolean;
    /** Оригинальный материал элемента (для восстановления) */
    originalMaterial?: StandardMaterial | PBRMaterial | null;
    /** Прозрачный материал элемента (создаётся динамически) */
    transparentMaterial?: StandardMaterial | PBRMaterial | null;
    /** Оригинальная позиция элемента (для сброса анимации) */
    originalPosition: Vector3;
    /** Оригинальный поворот элемента */
    originalRotation: Vector3;
    /** Оригинальный масштаб элемента */
    originalScaling: Vector3;
    /** Дополнительные метаданные */
    metadata: Record<string, any>;
}

/**
 * Данные об этаже
 */
export interface FloorData {
    /** Номер этажа */
    number: number;
    /** Элементы, принадлежащие этажу */
    elements: BuildingElement[];
    /** Видим ли этаж в данный момент */
    isVisible: boolean;
}

/**
 * Габаритные размеры здания
 */
export interface BuildingDimensions {
    /** Высота в метрах */
    height: number;
    /** Ширина в метрах */
    width: number;
    /** Глубина в метрах */
    depth: number;
}

/**
 * Прогресс загрузки здания
 */
export interface BuildingLoadProgress {
    /** Компонент, который загружается */
    component: string;
    /** Прогресс компонента (0-1) */
    progress: number;
    /** Общий прогресс (0-1) */
    overall: number;
}

/**
 * Тип маркера
 */
export type MarkerTypeDto = 'marker' | 'flag' | 'gateway' | 'waypoint';

/**
 * Парсенный маркер из модели
 */
export interface ParsedMarker {
    parsedMarker: string;
    /** Уникальный идентификатор маркера */
    id: string;
    /** Тип маркера */
    type: MarkerTypeDto;
    /** Внутреннее имя */
    name: string;
    /** Отображаемое имя */
    displayName: string;
    /** Позиция в 3D пространстве */
    position: Vector3;
    /** Список ID связанных маркеров */
    connections: string[];
    /** Номер этажа */
    floorNumber?: number;
    /** ID комнаты, в которой находится маркер */
    roomId?: string;
    /** Метаданные маркера */
    metadata: {
        number?: string;      // Для FL/WP - номер
        suffix?: string;      // Для одинаковых названий - суффикс (01, 02, 03)
        qr?: string;          // Для FL - QR код
        accessRights?: string[]; // Для GW - права доступа
        description?: string; // Для GW/MR - описание
        requiredRole?: UserInfo['role']; // Для GW - минимальная роль доступа
    };
}

/**
 * Парсенная комната из модели
 */
export interface ParsedRoom {
    /** Уникальный идентификатор комнаты */
    id: string;
    /** Внутреннее имя */
    name: string;
    /** Отображаемое имя */
    displayName: string;
    /** Стены комнаты */
    walls: BuildingElement[];
    /** ID маркеров в комнате */
    markers: string[];
    /** Позиция комнаты */
    position: Vector3;
    /** Номер этажа */
    floorNumber?: number;
    /** Минимальная роль для доступа */
    requiredRole?: UserInfo['role'];
    /** Нода комнаты в сцене */
    node?: AbstractMesh | TransformNode;
}

/**
 * Расширенный результат парсинга здания
 */
export interface BuildingParseResult {
    /** Все элементы здания (маппинг по имени) */
    elements: Map<string, BuildingElement>;
    /** Элементы, сгруппированные по этажам */
    floors: Map<number, BuildingElement[]>;
    /** Ноды этажей (пустые TransformNode для группировки) */
    floorNodes: Map<number, TransformNode>;
    /** Все стены */
    walls: BuildingElement[];
    /** Все окна */
    windows: BuildingElement[];
    /** Все двери */
    doors: BuildingElement[];
    /** Все лестницы */
    stairs: BuildingElement[];
    /** Парсенные комнаты */
    rooms: Map<string, ParsedRoom>;
    /** Парсенные маркеры */
    markers: Map<string, ParsedMarker>;
}
