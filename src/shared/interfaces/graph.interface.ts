import { Color3 } from "@babylonjs/core";

export interface GraphRendererConfig {
    lineColor: Color3;
    lineThickness: number;
    showArrows: boolean;
    arrowSize: number;
    activeColor: Color3;
    inactiveOpacity: number;
    routeColor: Color3;
    routeAnimationSpeed: number;
}