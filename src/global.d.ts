import * as BABYLON from '@babylonjs/core';

declare global {
  interface Window {
    __ENV__?: 'development' | 'production' | 'test';
    __CONFIG__?: Partial<import('./core/config/ConfigService').IAppConfig>;
    __APP__?: any;
    BABYLON: typeof BABYLON;
  }
}

export {};