import { logger } from "../../../core/logger/Logger";
import '../../../styles/components/building-title.css';

const titleLogger = logger.getLogger('BuildingTitle');

export class BuildingTitle {
  private _container: HTMLDivElement;
  private _titleText: HTMLSpanElement;

  constructor(buildingName: string = 'Test Building') {
    this.createTitle(buildingName);
  }

  private createTitle(buildingName: string): void {
    this._container = document.createElement('div');
    this._container.className = 'building-title';

    // Только текст с названием, без кнопки замка
    this._titleText = document.createElement('span');
    this._titleText.className = 'building-title-text';
    this._titleText.textContent = buildingName;

    this._container.appendChild(this._titleText);
    document.body.appendChild(this._container);
    
    titleLogger.debug(`Создана плашка с названием: ${buildingName}`);
  }

  /**
   * Установить название здания
   */
  public setBuildingName(name: string): void {
    this._titleText.textContent = name;
  }

  public get container(): HTMLDivElement {
    return this._container;
  }

  public dispose(): void {
    if (this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}