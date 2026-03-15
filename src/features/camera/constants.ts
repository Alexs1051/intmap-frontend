import { Vector3 } from "@babylonjs/core";

export const CAMERA_CONFIG = {
  // Базовая настройка
  defaultAlpha: -Math.PI / 2,  // Смотрим на север
  defaultBeta: Math.PI / 3,    // 60 градусов вниз
  defaultRadius: 40,
  defaultTarget: Vector3.Zero(),
  
  // Ограничения
  minBeta: 0.1,
  maxBeta: Math.PI / 2,
  minRadius: 5,
  maxRadius: 50,
  
  // Скорости
  rotationSpeed: 1.0,
  panningSpeed: 50,
  wheelPrecision: 10,
  pinchPrecision: 10,
  
  // Анимация
  animationSpeed: 2.0
};

// Позиции для разных режимов
export const CAMERA_POSITIONS = {
  intro: {
    alpha: Math.PI / 4,   // 45 градусов
    beta: Math.PI / 4,    // 45 градусов вниз
    radius: 60
  },
  building: {
    alpha: -Math.PI / 2,  // Север
    beta: Math.PI / 3,    // 60 градусов
    radius: 30
  },
  floor: {
    alpha: -Math.PI / 2,  // Север
    beta: Math.PI / 3,    // 60 градусов
    radius: 15
  }
};

// Привязки кнопок мыши
export const MOUSE_BUTTONS = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2
};