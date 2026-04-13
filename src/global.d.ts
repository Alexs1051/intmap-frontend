import * as BABYLON from '@babylonjs/core';
import { IAppConfig } from './shared/types';

/**
 * Публичный интерфейс экземпляра приложения
 */
interface AppInstance {
  stop(): void;
  dispose(): void;
}

declare global {
  interface Window {
    __ENV__?: 'development' | 'production' | 'test';
    __CONFIG__?: Partial<IAppConfig>;
    __APP__?: AppInstance;
    BABYLON: typeof BABYLON;
  }
}

export { };