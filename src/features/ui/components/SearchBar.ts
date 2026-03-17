import { Marker } from "../../markers/Marker";
import { logger } from "../../../core/logger/Logger";
import '../../../styles/components/search-bar.css';

const searchLogger = logger.getLogger('SearchBar');

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  icon?: string;
  floor?: number;
  marker?: Marker;
}

export class SearchBar {
  private _container: HTMLDivElement;
  private _input: HTMLInputElement;
  private _resultsContainer: HTMLDivElement;
  private _isVisible: boolean = false;
  private _onSearchCallback: ((query: string) => void) | null = null;
  private _onResultClickCallback: ((result: SearchResult) => void) | null = null;
  private _onCloseCallback: (() => void) | null = null;
  private _allMarkers: SearchResult[] = [];
  private readonly _maxResults: number = 50;

  constructor() {
    this.createSearchBar();
    this.loadAllMarkers();
  }

  private createSearchBar(): void {
    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.addEventListener('click', () => this.hide());
    document.body.appendChild(overlay);
    this._container = overlay;

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'search-input-wrapper';

    const searchIcon = document.createElement('i');
    searchIcon.className = 'fa-solid fa-search search-icon';

    this._input = document.createElement('input');
    this._input.type = 'text';
    this._input.placeholder = 'Поиск... (Esc для закрытия)';
    this._input.className = 'search-input';

    const counterSpan = document.createElement('span');
    counterSpan.className = 'search-counter';

    const clearButton = document.createElement('i');
    clearButton.className = 'fa-solid fa-times search-clear';
    clearButton.addEventListener('click', () => {
      this._input.value = '';
      this.clearResults();
    });

    this._input.addEventListener('input', () => {
      clearButton.style.display = this._input.value ? 'block' : 'none';
      this._input.value.length >= 1 ? this.performSearch() : this.clearResults();
    });

    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this._input.value.length >= 1) this.performSearch();
      if (e.key === 'Escape') this.hide();
    });

    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(this._input);
    inputWrapper.appendChild(counterSpan);
    inputWrapper.appendChild(clearButton);
    searchContainer.appendChild(inputWrapper);

    this._resultsContainer = document.createElement('div');
    this._resultsContainer.className = 'search-results';
    searchContainer.appendChild(this._resultsContainer);

    this._container.appendChild(searchContainer);
  }

  public loadAllMarkers(): void {
    const markerManager = (window as any).markerManager;
    if (markerManager) {
      const markers = markerManager.getAllMarkers();
      this._allMarkers = markers.map(m => ({
        id: m.data.id,
        name: m.data.title,
        type: m.data.type || 'marker',
        icon: m.data.icon,
        floor: m.data.floor,
        marker: m
      }));
    } else {
      this._allMarkers = this.generateMockMarkers(100);
    }
    searchLogger.debug(`Загружено маркеров: ${this._allMarkers.length}`);
  }

  private generateMockMarkers(count: number): SearchResult[] {
    const types = ['marker', 'floor', 'building'];
    const names = ['Вход', 'Выход', 'Лифт', 'Эскалатор', 'Туалет', 'Конференц-зал', 'Офис', 'Кафе', 'Парковка'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `marker-${i}`,
      name: `${names[i % names.length]} ${Math.floor(i / 10) + 1}`,
      type: types[i % types.length],
      icon: this.getIconForType(types[i % types.length]),
      floor: Math.floor(Math.random() * 5) + 1
    }));
  }

  private getIconForType(type: string): string {
    const icons: Record<string, string> = { marker: '📍', floor: '📌', building: '🏢' };
    return icons[type] || '📍';
  }

  private performSearch(): void {
    const query = this._input.value.toLowerCase();
    const filtered = this._allMarkers
      .filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.type.toLowerCase().includes(query) ||
        m.floor?.toString().includes(query)
      )
      .slice(0, this._maxResults);
    
    this.showResults(filtered);
    this._onSearchCallback?.(query);
  }

  private clearResults(): void {
    this._resultsContainer.innerHTML = '';
    this._resultsContainer.style.display = 'none';
  }

  public showResults(results: SearchResult[]): void {
    this._resultsContainer.innerHTML = '';
    this._resultsContainer.style.display = 'block';

    const counter = this._container.querySelector('.search-counter');
    if (counter) {
      counter.textContent = `📋 ${results.length}`;
      (counter as HTMLElement).style.display = results.length ? 'inline' : 'none';
    }

    if (!results.length) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.textContent = 'Ничего не найдено';
      this._resultsContainer.appendChild(noResults);
      return;
    }

    results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-result-item';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'search-result-icon';
      iconSpan.textContent = result.icon || '📍';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'search-result-name';
      nameSpan.textContent = result.name;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'search-result-meta';
      metaSpan.textContent = result.floor ? `${result.type} • ${result.floor} эт` : result.type;

      item.appendChild(iconSpan);
      item.appendChild(nameSpan);
      item.appendChild(metaSpan);

      item.addEventListener('click', () => {
        searchLogger.debug(`Выбран результат: ${result.name}`);
        this._onResultClickCallback?.(result);
        this.hide();
      });

      this._resultsContainer.appendChild(item);
    });
  }

  public toggle(): void {
    this._isVisible ? this.hide() : this.show();
  }

  public show(): void {
    this._isVisible = true;
    this._container.style.display = 'block';
    this.showResults(this._allMarkers.slice(0, this._maxResults));
    setTimeout(() => this._input.focus(), 100);
  }

  public hide(): void {
    this._isVisible = false;
    this._container.style.display = 'none';
    this._input.value = '';
    this.clearResults();
    this._onCloseCallback?.();
  }

  public setSearchCallback(callback: (query: string) => void): void {
    this._onSearchCallback = callback;
  }

  public setResultClickCallback(callback: (result: SearchResult) => void): void {
    this._onResultClickCallback = callback;
  }

  public setCloseCallback(callback: () => void): void {
    this._onCloseCallback = callback;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public updateMarkers(markers: SearchResult[]): void {
    this._allMarkers = markers;
  }

  public dispose(): void {
    if (this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}