import { injectable } from "inversify";
import { Logger } from "@core/logger/logger";
import { UI } from "@shared/constants";
import { IBuildingTitle } from "@shared/interfaces";
import { BuildingOption } from "@shared/types";

@injectable()
export class BuildingTitle implements IBuildingTitle {
  private logger: Logger;
  private config: typeof UI.BUILDING_TITLE;

  private container!: HTMLDivElement;
  private button!: HTMLButtonElement;
  private dropdown!: HTMLDivElement;
  private titleText!: HTMLSpanElement;
  private titleIcon!: HTMLImageElement;

  private options: BuildingOption[] = [];
  private selectedId: string | null = null;
  private isOpen: boolean = false;
  private onBuildingChange: ((buildingId: string) => void) | null = null;

  constructor(
    logger: Logger) {
    this.logger = logger.getLogger('BuildingTitle');
    this.config = UI.BUILDING_TITLE;

    this.createTitle();
    this.addTestBuildings();
    this.logger.debug("BuildingTitle created");
  }

  public update(): void { }

  private createTitle(): void {
    this.container = document.createElement('div');
    this.container.className = 'building-title';

    this.button = document.createElement('button');
    this.button.className = 'building-title-button ui-floating-surface';
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    this.titleIcon = document.createElement('img');
    this.titleIcon.className = 'building-title-icon';
    this.titleIcon.src = 'icons/ui/object.png';
    this.titleIcon.alt = 'Иконка здания';

    this.titleText = document.createElement('span');
    this.titleText.className = 'building-title-text';
    this.titleText.textContent = this.config.DEFAULT_TITLE;

    const arrowSpan = document.createElement('i');
    arrowSpan.className = 'building-title-arrow fa-solid fa-chevron-down';

    this.button.appendChild(this.titleIcon);
    this.button.appendChild(this.titleText);
    this.button.appendChild(arrowSpan);
    this.container.appendChild(this.button);

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'building-title-dropdown ui-floating-surface ui-floating-surface-strong';
    this.container.appendChild(this.dropdown);

    document.body.appendChild(this.container);

    document.addEventListener('click', () => {
      if (this.isOpen) {
        this.closeDropdown();
      }
    });
  }

  private toggleDropdown(): void {
    this.isOpen ? this.closeDropdown() : this.openDropdown();
  }

  private openDropdown(): void {
    this.isOpen = true;
    this.dropdown.classList.add('open');
  }

  private closeDropdown(): void {
    this.isOpen = false;
    this.dropdown.classList.remove('open');
  }

  private createDropdownItem(option: BuildingOption): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'building-title-dropdown-item';

    if (this.selectedId === option.id) {
      item.classList.add('active');
    }

    const iconImg = document.createElement('img');
    iconImg.className = 'building-title-dropdown-icon';
    iconImg.src = option.iconPath || 'icons/ui/object.png';
    iconImg.alt = option.name;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = option.name;

    item.appendChild(iconImg);
    item.appendChild(nameSpan);

    if (this.selectedId === option.id) {
      const checkSpan = document.createElement('i');
      checkSpan.className = 'fa-solid fa-check';
      item.appendChild(checkSpan);
    }

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectBuilding(option.id);
    });

    return item;
  }

  private selectBuilding(buildingId: string): void {
    if (this.selectedId === buildingId) {
      this.closeDropdown();
      return;
    }

    this.selectedId = buildingId;
    const selectedOption = this.options.find(o => o.id === buildingId);

    if (selectedOption) {
      this.titleText.textContent = selectedOption.name;
      this.titleIcon.src = selectedOption.iconPath || 'icons/ui/object.png';
      this.logger.info(`Building selected: ${selectedOption.name}`);
      this.rebuildDropdown();
      this.onBuildingChange?.(buildingId);
    }

    this.closeDropdown();
  }

  private rebuildDropdown(): void {
    this.dropdown.innerHTML = '';
    this.options.forEach(option => {
      this.dropdown.appendChild(this.createDropdownItem(option));
    });
  }

  private addTestBuildings(): void {
    const testBuildings: BuildingOption[] = [
      {
        id: 'building-01',
        name: 'Test_Building_01',
        modelUrl: '/models/building_01.glb',
        iconPath: 'icons/ui/object.png'
      },
      {
        id: 'building-02',
        name: 'Test_Building_02',
        modelUrl: '/models/building_02.glb',
        iconPath: 'icons/ui/pin.png'
      }
    ];

    this.setBuildings(testBuildings, 'building-02');
  }

  public setBuildings(options: BuildingOption[], selectedId?: string): void {
    this.options = options;
    this.selectedId = selectedId || options[0]?.id || null;

    const selectedOption = this.options.find(o => o.id === this.selectedId);
    this.titleText.textContent = selectedOption?.name || this.config.DEFAULT_TITLE;
    this.titleIcon.src = selectedOption?.iconPath || 'icons/ui/object.png';
    this.rebuildDropdown();
  }

  public addBuilding(option: BuildingOption, select?: boolean): void {
    this.options.push(option);

    if (select) {
      this.selectBuilding(option.id);
    } else {
      this.rebuildDropdown();
    }
  }

  public setOnBuildingChange(callback: (buildingId: string) => void): void {
    this.onBuildingChange = callback;
  }

  public get selectedBuilding(): BuildingOption | null {
    return this.options.find(o => o.id === this.selectedId) || null;
  }

  public dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.logger.info("BuildingTitle disposed");
  }
}
