export class FPSCounter {
  private _fpsElement: HTMLDivElement;
  private _lastTime: number = performance.now();
  private _frames: number = 0;
  private _fps: number = 0;

  constructor() {
    // Создаём элемент для отображения FPS
    this._fpsElement = document.createElement('div');
    this._fpsElement.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      color: white;
      font-family: monospace;
      font-size: 14px;
      background: rgba(0, 0, 0, 0.7);
      padding: 4px 8px;
      border-radius: 4px;
      z-index: 1000;
      pointer-events: none;
    `;
    document.body.appendChild(this._fpsElement);
  }

  public update(): void {
    this._frames++;
    
    const now = performance.now();
    const delta = now - this._lastTime;
    
    if (delta >= 1000) { // Обновляем каждую секунду
      this._fps = Math.round((this._frames * 1000) / delta);
      this._fpsElement.textContent = `FPS: ${this._fps}`;
      
      // Меняем цвет в зависимости от FPS
      if (this._fps < 30) {
        this._fpsElement.style.color = '#ff4444'; // Красный
      } else if (this._fps < 50) {
        this._fpsElement.style.color = '#ffaa44'; // Жёлтый
      } else {
        this._fpsElement.style.color = '#44ff44'; // Зелёный
      }
      
      this._frames = 0;
      this._lastTime = now;
    }
  }
}