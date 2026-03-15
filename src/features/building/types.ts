import { AbstractMesh, Material, Vector3, TransformNode } from "@babylonjs/core";

export type ElementType = 'floor' | 'wall' | 'window' | 'door' | 'stair' | 'other';

export interface BuildingElement {
  name: string;
  mesh: AbstractMesh;
  type: ElementType;
  floorNumber?: number;
  isVisible: boolean;
  originalMaterial?: Material | null;
  originalPosition: Vector3;
  originalRotation: Vector3;
  originalScaling: Vector3;
  renderingGroupId?: number; // Добавляем группу рендеринга
}

export interface FloorData {
  number: number;
  elements: BuildingElement[];
  isVisible: boolean;
}

export interface BuildingData {
  elements: Map<string, BuildingElement>;
  floors: Map<number, BuildingElement[]>;
  walls: BuildingElement[];
  windows: BuildingElement[];
  doors: BuildingElement[];
  stairs: BuildingElement[];
  floorNodes: Map<number, TransformNode>;
}