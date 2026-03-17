import '../../../styles/components/fps-counter.css';

export class FPSCounter {
  private _fpsElement: HTMLDivElement;
  private _lastTime: number = performance.now();
  private _frames: number = 0;
  private _fps: number = 0;

  constructor() {
    this._fpsElement = document.createElement('div');
    this._fpsElement.id = 'fps-counter';
    this._fpsElement.className = 'fps-counter';
    document.body.appendChild(this._fpsElement);
  }

  public update(): void {
    this._frames++;
    
    const now = performance.now();
    const delta = now - this._lastTime;
    
    if (delta >= 1000) {
      this._fps = Math.round((this._frames * 1000) / delta);
      this._fpsElement.textContent = `FPS: ${this._fps}`;
      
      this._fpsElement.classList.remove('good', 'warning', 'bad');
      if (this._fps < 30) {
        this._fpsElement.classList.add('bad');
      } else if (this._fps < 50) {
        this._fpsElement.classList.add('warning');
      } else {
        this._fpsElement.classList.add('good');
      }
      
      this._frames = 0;
      this._lastTime = now;
    }
  }

  public dispose(): void {
    if (this._fpsElement.parentNode) {
      this._fpsElement.parentNode.removeChild(this._fpsElement);
    }
  }
}