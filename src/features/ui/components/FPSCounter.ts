export class FPSCounter {
  private _fpsElement: HTMLDivElement;
  private _lastTime: number = performance.now();
  private _frames: number = 0;
  private _fps: number = 0;

  constructor() {
    this._fpsElement = document.createElement('div');
    this._fpsElement.id = 'fps-counter';
    this._fpsElement.style.cssText = `
      position: absolute;
      top: 10px;
      right: 20px; /* Слева было 10px, теперь справа 20px */
      color: white;
      font-family: monospace;
      font-size: 14px;
      background: rgba(0, 0, 0, 0.7);
      padding: 4px 8px;
      border-radius: 4px;
      z-index: 1000;
      pointer-events: none;
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `;
    document.body.appendChild(this._fpsElement);
  }

  public update(): void {
    this._frames++;
    
    const now = performance.now();
    const delta = now - this._lastTime;
    
    if (delta >= 1000) {
      this._fps = Math.round((this._frames * 1000) / delta);
      this._fpsElement.textContent = `FPS: ${this._fps}`;
      
      // Меняем цвет в зависимости от FPS
      if (this._fps < 30) {
        this._fpsElement.style.color = '#ff4444'; // Красный
        this._fpsElement.style.background = 'rgba(255, 68, 68, 0.2)';
      } else if (this._fps < 50) {
        this._fpsElement.style.color = '#ffaa44'; // Жёлтый
        this._fpsElement.style.background = 'rgba(255, 170, 68, 0.2)';
      } else {
        this._fpsElement.style.color = '#44ff44'; // Зелёный
        this._fpsElement.style.background = 'rgba(68, 255, 68, 0.2)';
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