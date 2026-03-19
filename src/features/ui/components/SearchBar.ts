import { Marker } from "../../markers/Marker";
import { MarkerType } from "../../markers/types";
import { logger } from "../../../core/logger/Logger";
import { rgbaToCss } from "../../markers/utils/iconUtils";
import '../../../styles/components/search-bar.css';

const searchLogger = logger.getLogger('SearchBar');

export interface SearchResult {
  id: string;
  name: string;
  type: MarkerType;
  iconName: string;
  floor?: number;
  marker: Marker; // Обязательная ссылка на маркер
  backgroundColor?: { r: number; g: number; b: number; a: number };
  textColor?: { r: number; g: number; b: number; a: number };
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
  private _markerManager: any = null; // Ссылка на MarkerManager

  constructor() {
    this.createSearchBar();
  }

  /**
   * Установить менеджер маркеров и загрузить данные
   */
  public setMarkerManager(markerManager: any): void {
    this._markerManager = markerManager;
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
    this._input.placeholder = 'Поиск меток... (Esc для закрытия)';
    this._input.className = 'search-input';

    const counterSpan = document.createElement('span');
    counterSpan.className = 'search-counter';

    const clearButton = document.createElement('i');
    clearButton.className = 'fa-solid fa-times search-clear';
    clearButton.addEventListener('click', () => {
      this._input.value = '';
      this.clearResults();
      this._input.focus();
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

  /**
   * Загрузить все маркеры из MarkerManager
   */
  public loadAllMarkers(): void {
    if (!this._markerManager) {
      searchLogger.warn("MarkerManager не установлен");
      this._allMarkers = [];
      return;
    }

    try {
      const markers = this._markerManager.getAllMarkers();
      this._allMarkers = markers.map((m: Marker) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        iconName: m.iconName,
        floor: m.floor,
        marker: m,
        backgroundColor: m.backgroundColor,
        textColor: m.textColor
      }));
      
      searchLogger.info(`Загружено ${this._allMarkers.length} маркеров для поиска`);
    } catch (error) {
      searchLogger.error("Ошибка загрузки маркеров", error);
      this._allMarkers = [];
    }
  }

  /**
   * Обновить список маркеров (вызывать при изменении)
   */
  public refreshMarkers(): void {
    this.loadAllMarkers();
  }

  private performSearch(): void {
    const query = this._input.value.toLowerCase().trim();
    
    if (query.length < 1) {
      this.clearResults();
      return;
    }

    // Фильтруем маркеры по названию, типу и этажу
    const filtered = this._allMarkers
      .filter(m => {
        // Поиск по названию
        if (m.name.toLowerCase().includes(query)) return true;
        
        // Поиск по типу
        if (m.type.toLowerCase().includes(query)) return true;
        
        // Поиск по этажу (как число)
        if (m.floor && m.floor.toString().includes(query)) return true;
        
        // Поиск по ID (для отладки)
        if (m.id.toLowerCase().includes(query)) return true;
        
        return false;
      })
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

    if (results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.textContent = 'Ничего не найдено';
      this._resultsContainer.appendChild(noResults);
      return;
    }

    results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      
      // Добавляем цветовую индикацию типа маркера
      if (result.backgroundColor) {
        item.style.borderLeft = `4px solid ${rgbaToCss(result.backgroundColor)}`;
      }

      // Иконка
      const iconSpan = document.createElement('span');
      iconSpan.className = 'search-result-icon';
      iconSpan.textContent = result.iconName || '📍';
      iconSpan.style.fontFamily = "'Material Icons', 'Material Symbols Outlined'";
      if (result.textColor) {
        iconSpan.style.color = rgbaToCss(result.textColor);
      }

      // Контейнер для текста
      const textContainer = document.createElement('div');
      textContainer.className = 'search-result-text';

      // Название
      const nameSpan = document.createElement('div');
      nameSpan.className = 'search-result-name';
      nameSpan.textContent = result.name;

      // Мета-информация (тип и этаж)
      const metaSpan = document.createElement('div');
      metaSpan.className = 'search-result-meta';
      
      // Иконка типа
      const typeIcon = this.getTypeIcon(result.type);
      
      if (result.floor) {
        metaSpan.innerHTML = `${typeIcon} ${this.getTypeName(result.type)} • ${result.floor} этаж`;
      } else {
        metaSpan.innerHTML = `${typeIcon} ${this.getTypeName(result.type)}`;
      }

      textContainer.appendChild(nameSpan);
      textContainer.appendChild(metaSpan);

      item.appendChild(iconSpan);
      item.appendChild(textContainer);

      // Добавляем эффект наведения
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });

      item.addEventListener('click', () => {
        searchLogger.info(`Выбран маркер: ${result.name} (${result.id})`);
        
        // Вызываем колбэк с результатом
        if (this._onResultClickCallback) {
          this._onResultClickCallback(result);
        }
        
        this.hide();
      });

      this._resultsContainer.appendChild(item);
    });
  }

  /**
   * Получить иконку для типа маркера
   */
  private getTypeIcon(type: MarkerType): string {
    switch (type) {
      case MarkerType.MARKER:
        return '📍';
      case MarkerType.FLAG:
        return '🚩';
      case MarkerType.WAYPOINT:
        return '●';
      default:
        return '📍';
    }
  }

  /**
   * Получить название типа маркера
   */
  private getTypeName(type: MarkerType): string {
    switch (type) {
      case MarkerType.MARKER:
        return 'Метка';
      case MarkerType.FLAG:
        return 'Флаг';
      case MarkerType.WAYPOINT:
        return 'Точка';
      default:
        return 'Метка';
    }
  }

  public toggle(): void {
    this._isVisible ? this.hide() : this.show();
  }

  public show(): void {
    // Обновляем маркеры перед показом
    this.refreshMarkers();
    
    this._isVisible = true;
    this._container.style.display = 'block';
    
    // Показываем последние 50 маркеров (или все, если меньше)
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