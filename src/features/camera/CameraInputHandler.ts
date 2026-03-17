import { ArcRotateCamera } from "@babylonjs/core";

export class CameraInputHandler {
  private _isLeftPressed: boolean = false;
  private _isMiddlePressed: boolean = false;
  private _isRightPressed: boolean = false;

  constructor(
    private readonly _camera: ArcRotateCamera,
    private readonly _canvas: HTMLCanvasElement
  ) {
    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    this._canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this._canvas.addEventListener('mousedown', (e) => {
      switch (e.button) {
        case 0: this._isLeftPressed = true; break;
        case 1: this._isMiddlePressed = true; break;
        case 2: this._isRightPressed = true; break;
      }
    });

    this._canvas.addEventListener('mouseup', (e) => {
      switch (e.button) {
        case 0: this._isLeftPressed = false; break;
        case 1: this._isMiddlePressed = false; break;
        case 2: this._isRightPressed = false; break;
      }
    });

    window.addEventListener('blur', () => {
      this._isLeftPressed = false;
      this._isMiddlePressed = false;
      this._isRightPressed = false;
    });
  }

  public canInteractWithUI(): boolean {
    return !this._isLeftPressed && !this._isMiddlePressed && !this._isRightPressed;
  }

  public dispose(): void {}
}