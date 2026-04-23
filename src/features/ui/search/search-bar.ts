import { injectable } from "inversify";
import { Logger } from "@core/logger/logger";
import { EventType } from "@core/events/event-types";
import { EventBus } from "@core/events/event-bus";
import { SearchResult, MarkerType } from "@shared/types";
import { UI, MARKER_WIDGET } from "@shared/constants";
import { IMarkerManager, ISearchBar } from "@shared/interfaces";
import { SearchBarIndexService } from "./search-bar-index-service";
import { SearchBarQueryService } from "./search-bar-query-service";

/**
 * Поисковая строка
 */
@injectable()
export class SearchBar implements ISearchBar {
  private logger: Logger;
  private eventBus: EventBus;
  private config: typeof UI.SEARCH;
  private readonly indexService = new SearchBarIndexService();
  private readonly queryService = new SearchBarQueryService();

  private container!: HTMLDivElement;
  private input!: HTMLInputElement;
  private resultsContainer!: HTMLDivElement;
  private overlay!: HTMLDivElement;

  private _isVisible: boolean = false;
  private allMarkers: SearchResult[] = [];
  private markerManager: IMarkerManager | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private selectedIndex: number = -1;

  private onSearchCallback: ((query: string) => void) | null = null;
  private onResultClickCallback: ((result: SearchResult) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;

  constructor(
    logger: Logger,
    eventBus: EventBus
  ) {
    this.logger = logger.getLogger('SearchBar');
    this.eventBus = eventBus;
    this.config = UI.SEARCH;

    this.createSearchBar();
    this.setupKeyboardNavigation();
    this.logger.debug("SearchBar created");
  }

  public update(): void {
    // UI компонент не требует обновления
  }

  private createSearchBar(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'search-overlay ui-modal-overlay';
    this.overlay.addEventListener('click', () => this.hide());

    this.container = document.createElement('div');
    this.container.className = 'search-container ui-modal-surface';
    this.container.addEventListener('click', (e) => e.stopPropagation());

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'search-input-wrapper';

    const searchIcon = document.createElement('i');
    searchIcon.className = 'fa-solid fa-search search-icon';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = this.config.PLACEHOLDER;
    this.input.className = 'search-input';
    this.input.spellcheck = false;
    this.input.setAttribute('autocapitalize', 'off');
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('autocorrect', 'off');
    this.input.setAttribute('enterkeyhint', 'search');
    this.setupInputHandlers();

    const counterSpan = document.createElement('span');
    counterSpan.className = 'search-counter';

    const clearButton = document.createElement('i');
    clearButton.className = 'fa-solid fa-times search-clear';
    clearButton.addEventListener('click', () => this.clearSearch());

    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(this.input);
    inputWrapper.appendChild(counterSpan);
    inputWrapper.appendChild(clearButton);

    this.resultsContainer = document.createElement('div');
    this.resultsContainer.className = 'search-results';

    this.container.appendChild(inputWrapper);
    this.container.appendChild(this.resultsContainer);
    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);
  }


  private setupInputHandlers(): void {
    this.input.addEventListener('input', () => {
      this.setClearButtonVisible(Boolean(this.input.value));

      if (this.input.value.length >= this.config.MIN_QUERY_LENGTH) {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.performSearch(), this.config.DEBOUNCE_DELAY);
      } else {
        this.clearResults();
      }
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.input.value.length >= this.config.MIN_QUERY_LENGTH) {
        this.performSearch();
      }
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }

  private setupKeyboardNavigation(): void {
    this.input.addEventListener('keydown', (e) => {
      if (!this._isVisible) return;

      const items = Array.from(this.resultsContainer.querySelectorAll('.search-result-item')) as HTMLDivElement[];

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
          this.updateSelection(items);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
          this.updateSelection(items);
          break;
        case 'Enter':
          e.preventDefault();
          if (this.selectedIndex >= 0 && this.selectedIndex < items.length) {
            const selectedItem = items[this.selectedIndex];
            if (selectedItem) {
              selectedItem.click();
            }
          } else if (items.length > 0) {
            const firstItem = items[0];
            if (firstItem) {
              firstItem.click();
            }
          }
          break;
      }
    });
  }

  private updateSelection(items: HTMLDivElement[]): void {
    items.forEach((item, index) => {
      if (index === this.selectedIndex && item) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else if (item) {
        item.classList.remove('selected');
      }
    });
  }

  private clearSearch(): void {
    this.input.value = '';
    this.clearResults();
    this.input.focus();
  }

  private clearResults(): void {
    this.resultsContainer.innerHTML = '';
    this.resultsContainer.style.display = 'none';
    this.selectedIndex = -1;
    this.updateCounter(0);
  }

  private performSearch(): void {
    const query = this.input.value.trim();

    if (query.length < this.config.MIN_QUERY_LENGTH) {
      this.clearResults();
      return;
    }

    const filtered = this.queryService.filterResults(this.allMarkers, query, this.config.MAX_RESULTS);

    this.showResults(filtered);
    this.onSearchCallback?.(query);
  }

  private showResults(results: SearchResult[]): void {
    this.resultsContainer.innerHTML = '';
    this.resultsContainer.style.display = 'block';
    this.selectedIndex = -1;
    this.updateCounter(results.length);

    if (results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.textContent = 'Ничего не найдено';
      this.resultsContainer.appendChild(noResults);
      return;
    }

    results.forEach(result => {
      const item = this.createResultItem(result);
      this.resultsContainer.appendChild(item);
    });
  }

  private createResultItem(result: SearchResult): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'search-result-item';

    if (result.backgroundColor) {
      const bg = result.backgroundColor;
      item.style.borderLeft = `4px solid rgba(${bg.r * 255}, ${bg.g * 255}, ${bg.b * 255}, 1)`;
    }

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'search-result-icon-wrapper';

    const iconImg = document.createElement('img');
    iconImg.className = 'search-result-icon-img';
    iconImg.src = this.getIconPath(result.iconName || 'location_on');
    // Применяем цвет foreground к иконке через SVG feColorMatrix filter
    if (result.textColor) {
      const tc = result.textColor;
      const svgFilter = `<svg xmlns="http://www.w3.org/2000/svg"><filter id="tint"><feColorMatrix type="matrix" values="0 0 0 0 ${tc.r} 0 0 0 0 ${tc.g} 0 0 0 0 ${tc.b} 0 0 0 1 0"/></filter></svg>`;
      const encodedFilter = encodeURIComponent(svgFilter);
      iconImg.style.filter = `url("data:image/svg+xml;utf8,${encodedFilter}#tint")`;
    }

    iconWrapper.appendChild(iconImg);

    const textContainer = document.createElement('div');
    textContainer.className = 'search-result-text';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'search-result-name';
    nameSpan.textContent = result.name;

    const metaSpan = document.createElement('div');
    metaSpan.className = 'search-result-meta';
    metaSpan.innerHTML = this.buildMetaLabel(result);

    textContainer.appendChild(nameSpan);
    textContainer.appendChild(metaSpan);

    item.appendChild(iconWrapper);
    item.appendChild(textContainer);

    item.setAttribute('data-result-id', result.id);

    item.addEventListener('mouseenter', () => {
      item.classList.add('selected');
    });

    item.addEventListener('mouseleave', () => {
      if (item !== this.resultsContainer.querySelectorAll('.search-result-item')[this.selectedIndex]) {
        item.classList.remove('selected');
      }
    });

    item.addEventListener('click', () => {
      this.logger.info(`Result selected: ${result.name}`);
      this.onResultClickCallback?.(result);
      this.hide();
    });

    return item;
  }

  private getTypeIcon(type: MarkerType): string {
    switch (type) {
      case MarkerType.MARKER: return '📍';
      case MarkerType.FLAG: return '🚩';
      case MarkerType.GATEWAY: return '🚧';
      default: return '📍';
    }
  }

  private getIconPath(iconName: string): string {
    const iconMap: { [key: string]: string } = {
      location_on: MARKER_WIDGET.ICON_PATH_WAYPOINT,
      flag: MARKER_WIDGET.ICON_PATH_FLAG,
      warning: MARKER_WIDGET.ICON_PATH_GATEWAY_ALLOWED,
      'gateway-allowed': MARKER_WIDGET.ICON_PATH_GATEWAY_ALLOWED,
      'gateway-blocked': MARKER_WIDGET.ICON_PATH_GATEWAY_BLOCKED,
      circle: MARKER_WIDGET.ICON_PATH_MARKER,
      '📍': MARKER_WIDGET.ICON_PATH_MARKER,
      '🚩': MARKER_WIDGET.ICON_PATH_FLAG,
      '🔘': MARKER_WIDGET.ICON_PATH_WAYPOINT
    };

    return iconMap[iconName] || MARKER_WIDGET.ICON_PATH_MARKER;
  }

  private getTypeName(type: MarkerType): string {
    switch (type) {
      case MarkerType.MARKER: return 'Метка';
      case MarkerType.FLAG: return 'Флаг';
      case MarkerType.GATEWAY: return 'Шлюз доступа';
      default: return 'Метка';
    }
  }

  public refreshMarkers(): void {
    if (!this.markerManager) return;

    try {
      this.allMarkers = this.indexService.buildResults(this.markerManager);

      if (this._isVisible && this.input.value.length >= this.config.MIN_QUERY_LENGTH) {
        this.performSearch();
      }
    } catch (error) {
      this.logger.error('Error refreshing markers', error);
      this.allMarkers = [];
    }
  }

  public setMarkerManager(manager: IMarkerManager): void {
    this.markerManager = manager;
    this.refreshMarkers();
  }

  public show(): void {
    this.refreshMarkers();
    this._isVisible = true;
    this.overlay.classList.add('visible');
    this.clearResults();
    this.selectedIndex = -1;

    this.input.focus();
    requestAnimationFrame(() => this.input.focus());
    setTimeout(() => this.input.focus(), 100);
    this.eventBus.emit(EventType.UI_SEARCH_OPEN);
  }

  public hide(): void {
    this._isVisible = false;
    this.overlay.classList.remove('visible');
    this.input.value = '';
    this.clearResults();
    this.selectedIndex = -1;
    this.onCloseCallback?.();
    this.eventBus.emit(EventType.UI_SEARCH_CLOSE);
  }

  public toggle(): void {
    this._isVisible ? this.hide() : this.show();
  }

  public setSearchCallback(callback: (query: string) => void): void {
    this.onSearchCallback = callback;
  }

  public setResultClickCallback(callback: (result: SearchResult) => void): void {
    this.onResultClickCallback = callback;
  }

  public setCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public dispose(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.logger.info("SearchBar disposed");
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  private updateCounter(count: number): void {
    const counter = this.container.querySelector('.search-counter');
    if (!counter) {
      return;
    }

    counter.textContent = `📋 ${count}`;
    (counter as HTMLElement).style.display = count > 0 ? 'inline' : 'none';
  }

  private setClearButtonVisible(visible: boolean): void {
    const clearButton = this.container.querySelector('.search-clear') as HTMLElement | null;
    if (clearButton) {
      clearButton.style.display = visible ? 'block' : 'none';
    }
  }

  private buildMetaLabel(result: SearchResult): string {
    const typeIcon = this.getTypeIcon(result.type);
    const typeName = this.getTypeName(result.type);

    return typeof result.floor === 'number'
      ? `${typeIcon} ${typeName} • ${result.floor} этаж`
      : `${typeIcon} ${typeName}`;
  }
}
