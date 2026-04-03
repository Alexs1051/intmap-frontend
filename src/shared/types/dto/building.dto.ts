import { AbstractMesh, TransformNode, StandardMaterial, PBRMaterial, Vector3 } from "@babylonjs/core";
import { ElementType } from "../enum/building.enum";

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
 * Результат парсинга модели здания
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