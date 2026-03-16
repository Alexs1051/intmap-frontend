import { Marker } from "../../markers/Marker";
import { MarkerManager } from "../../markers/MarkerManager";

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  icon?: string;
  floor?: number;
  marker?: Marker; // Ссылка на саму метку
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
  private _maxResults: number = 50;

  constructor() {
    this.createSearchBar();
    this.loadAllMarkers();
  }

  private createSearchBar(): void {
    // Затемняющий фон
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      z-index: 1999;
      display: none;
      transition: opacity 0.3s ease;
    `;
    overlay.addEventListener('click', () => this.hide());
    document.body.appendChild(overlay);
    this._container = overlay;

    // Контейнер для поиска
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 500px;
      max-width: 90vw;
      background: rgba(30, 30, 40, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    `;

    // Поле ввода
    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = `
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const searchIcon = document.createElement('i');
    searchIcon.className = 'fa-solid fa-search';
    searchIcon.style.cssText = `
      color: #888;
      margin-right: 12px;
      font-size: 18px;
    `;

    this._input = document.createElement('input');
    this._input.type = 'text';
    this._input.placeholder = 'Поиск... (Esc для закрытия)';
    this._input.style.cssText = `
      flex: 1;
      background: transparent;
      border: none;
      color: white;
      font-size: 16px;
      outline: none;
      padding: 4px 0;
    `;

    // Счётчик результатов
    const counterSpan = document.createElement('span');
    counterSpan.id = 'search-counter';
    counterSpan.style.cssText = `
      color: #888;
      font-size: 14px;
      margin-right: 10px;
      display: none;
    `;

    // Кнопка очистки
    const clearButton = document.createElement('i');
    clearButton.className = 'fa-solid fa-times';
    clearButton.style.cssText = `
      color: #888;
      cursor: pointer;
      font-size: 18px;
      display: none;
      transition: color 0.2s ease;
    `;
    clearButton.addEventListener('mouseenter', () => {
      clearButton.style.color = '#fff';
    });
    clearButton.addEventListener('mouseleave', () => {
      clearButton.style.color = '#888';
    });
    clearButton.addEventListener('click', () => {
      this._input.value = '';
      this.clearResults();
      clearButton.style.display = 'none';
      counterSpan.style.display = 'none';
    });

    this._input.addEventListener('input', () => {
      clearButton.style.display = this._input.value ? 'block' : 'none';
      if (this._input.value.length >= 1) { // Поиск с 1 символа
        this.performSearch();
      } else {
        this.clearResults();
      }
    });

    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this._input.value.length >= 1) {
        this.performSearch();
      }
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(this._input);
    inputWrapper.appendChild(counterSpan);
    inputWrapper.appendChild(clearButton);
    searchContainer.appendChild(inputWrapper);

    this._resultsContainer = document.createElement('div');
    this._resultsContainer.style.cssText = `
      max-height: 400px;
      overflow-y: auto;
      display: none;
    `;
    searchContainer.appendChild(this._resultsContainer);

    this._container.appendChild(searchContainer);
  }

  /**
   * Загрузить все маркеры из MarkerManager
   */
  public loadAllMarkers(): void {
    // Получаем все маркеры из MarkerManager
    const markerManager = (window as any).markerManager; // Временное решение
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
      // Заглушка для тестирования
      this._allMarkers = this.generateMockMarkers(100);
    }
    console.log(`📋 Загружено маркеров для поиска: ${this._allMarkers.length}`);
  }

  /**
   * Сгенерировать тестовые маркеры
   */
  private generateMockMarkers(count: number): SearchResult[] {
    const types = ['marker', 'floor', 'building'];
    const names = [
      'Вход', 'Выход', 'Лифт', 'Эскалатор', 'Туалет',
      'Конференц-зал', 'Переговорная', 'Офис', 'Кафе',
      'Парковка', 'Лестница', 'Ресепшн', 'Склад'
    ];
    
    const results: SearchResult[] = [];
    for (let i = 0; i < count; i++) {
      const nameIndex = Math.floor(Math.random() * names.length);
      const typeIndex = Math.floor(Math.random() * types.length);
      results.push({
        id: `marker-${i}`,
        name: `${names[nameIndex]} ${Math.floor(i / 10) + 1}`,
        type: types[typeIndex],
        icon: this.getIconForType(types[typeIndex]),
        floor: Math.floor(Math.random() * 5) + 1
      });
    }
    return results;
  }

  private getIconForType(type: string): string {
    switch (type) {
      case 'marker': return '📍';
      case 'floor': return '📌';
      case 'building': return '🏢';
      default: return '📍';
    }
  }

  private performSearch(): void {
    const query = this._input.value.toLowerCase();
    
    // Фильтруем маркеры
    const filtered = this._allMarkers
      .filter(m => 
        m.name.toLowerCase().includes(query) ||
        (m.type && m.type.toLowerCase().includes(query)) ||
        (m.floor && m.floor.toString().includes(query))
      )
      .slice(0, this._maxResults);
    
    this.showResults(filtered);
    
    if (this._onSearchCallback) {
      this._onSearchCallback(query);
    }
  }

  private clearResults(): void {
    this._resultsContainer.innerHTML = '';
    this._resultsContainer.style.display = 'none';
  }

  /**
   * Показать результаты поиска
   */
  public showResults(results: SearchResult[]): void {
    this._resultsContainer.innerHTML = '';
    this._resultsContainer.style.display = 'block';

    // Обновляем счётчик
    const counter = document.getElementById('search-counter');
    if (counter) {
      if (results.length > 0) {
        counter.textContent = `📋 ${results.length}`;
        counter.style.display = 'inline';
      } else {
        counter.style.display = 'none';
      }
    }

    if (results.length === 0) {
      const noResults = document.createElement('div');
      noResults.style.cssText = `
        padding: 20px;
        text-align: center;
        color: #888;
        font-style: italic;
      `;
      noResults.textContent = 'Ничего не найдено';
      this._resultsContainer.appendChild(noResults);
      return;
    }

    results.forEach(result => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.2s ease;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        gap: 12px;
      `;

      // Иконка
      const iconSpan = document.createElement('span');
      iconSpan.textContent = result.icon || '📍';
      iconSpan.style.cssText = `
        font-size: 20px;
        width: 30px;
        text-align: center;
      `;

      // Название
      const nameSpan = document.createElement('span');
      nameSpan.textContent = result.name;
      nameSpan.style.cssText = `
        flex: 1;
        color: white;
        font-weight: 500;
      `;

      // Тип и этаж
      const metaSpan = document.createElement('span');
      metaSpan.style.cssText = `
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        color: #aaa;
        display: flex;
        gap: 4px;
      `;
      
      if (result.floor) {
        metaSpan.innerHTML = `${result.type} • ${result.floor} эт`;
      } else {
        metaSpan.textContent = result.type;
      }

      item.appendChild(iconSpan);
      item.appendChild(nameSpan);
      item.appendChild(metaSpan);

      // Hover эффект
      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(255, 255, 255, 0.1)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });

      // Клик по результату
      item.addEventListener('click', () => {
        console.log(`Selected: ${result.name} (${result.type})`);
        
        if (this._onResultClickCallback) {
          this._onResultClickCallback(result);
        }
        
        // Подсветка в консоли (временно)
        if (result.marker) {
          console.log('🎯 Найден маркер:', result.marker);
        }
        
        this.hide();
      });

      this._resultsContainer.appendChild(item);
    });
  }

  /**
   * Показать/скрыть поиск
   */
  public toggle(): void {
    if (this._isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Показать поиск
   */
  public show(): void {
    this._isVisible = true;
    this._container.style.display = 'block';
    
    // Показываем все маркеры при открытии
    this.showResults(this._allMarkers.slice(0, this._maxResults));
    
    setTimeout(() => {
      this._input.focus();
    }, 100);
  }

  /**
   * Скрыть поиск
   */
  public hide(): void {
    this._isVisible = false;
    this._container.style.display = 'none';
    this._input.value = '';
    this.clearResults();
    if (this._onCloseCallback) {
      this._onCloseCallback();
    }
  }

  /**
   * Установить колбэк для поиска
   */
  public setSearchCallback(callback: (query: string) => void): void {
    this._onSearchCallback = callback;
  }

  /**
   * Установить колбэк для клика по результату
   */
  public setResultClickCallback(callback: (result: SearchResult) => void): void {
    this._onResultClickCallback = callback;
  }

  /**
   * Установить колбэк при закрытии
   */
  public setCloseCallback(callback: () => void): void {
    this._onCloseCallback = callback;
  }

  /**
   * Проверить, виден ли поиск
   */
  public get isVisible(): boolean {
    return this._isVisible;
  }

  /**
   * Обновить список маркеров
   */
  public updateMarkers(markers: SearchResult[]): void {
    this._allMarkers = markers;
  }

  public dispose(): void {
    if (this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}