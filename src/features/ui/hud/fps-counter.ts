import { injectable } from "inversify";
import { Logger } from "@core/logger/logger";
import { IFPSCounter } from "@shared/interfaces";

/**
 * Счетчик FPS
 */
@injectable()
export class FPSCounter implements IFPSCounter {
  private logger: Logger;

  private fpsElement: HTMLDivElement;
  private lastTime: number = performance.now();
  private frames: number = 0;
  private fps: number = 0;
  private isVisible: boolean = true;

  constructor(
    logger: Logger) {
    this.logger = logger.getLogger('FPSCounter');

    this.fpsElement = document.createElement('div');
    this.fpsElement.id = 'fps-counter';
    this.fpsElement.className = 'fps-counter';
    this.fpsElement.textContent = 'FPS: --';
    document.body.appendChild(this.fpsElement);

    this.logger.debug("FPSCounter created");
  }

  public update(): void {
    if (!this.isVisible) return;

    this.frames++;

    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= 1000) {
      this.fps = Math.round((this.frames * 1000) / delta);
      this.fpsElement.textContent = `FPS: ${this.fps}`;

      // Цветовая индикация
      this.fpsElement.classList.remove('good', 'warning', 'bad');
      if (this.fps < 30) {
        this.fpsElement.classList.add('bad');
      } else if (this.fps < 50) {
        this.fpsElement.classList.add('warning');
      } else {
        this.fpsElement.classList.add('good');
      }

      this.frames = 0;
      this.lastTime = now;
    }
  }

  public setVisible(visible: boolean): void {
    if (this.fpsElement) {
      this.fpsElement.style.display = visible ? 'block' : 'none';
    }
  }

  public dispose(): void {
    if (this.fpsElement.parentNode) {
      this.fpsElement.parentNode.removeChild(this.fpsElement);
    }
    this.logger.info("FPSCounter disposed");
  }
}