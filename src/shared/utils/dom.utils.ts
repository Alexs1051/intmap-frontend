/**
 * Получает canvas элемент по ID или создаёт новый
 * @param id - ID canvas элемента
 * @returns canvas элемент
 */
export const getCanvas = (id?: string): HTMLCanvasElement => {
    if (id) {
        const canvas = document.getElementById(id) as HTMLCanvasElement;
        if (canvas) return canvas;
    }
    
    const canvas = document.createElement('canvas');
    canvas.id = id || 'gameCanvas';
    document.body.appendChild(canvas);
    return canvas;
};

/**
 * Добавляет CSS стили к элементу
 * @param element - целевой элемент
 * @param styles - объект со стилями
 */
export const addStyles = (element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void => {
    Object.assign(element.style, styles);
};

/**
 * Добавляет CSS класс к элементу
 * @param element - целевой элемент
 * @param className - имя класса
 */
export const addClass = (element: HTMLElement, className: string): void => {
    element.classList.add(className);
};

/**
 * Удаляет CSS класс у элемента
 * @param element - целевой элемент
 * @param className - имя класса
 */
export const removeClass = (element: HTMLElement, className: string): void => {
    element.classList.remove(className);
};

/**
 * Переключает CSS класс у элемента
 * @param element - целевой элемент
 * @param className - имя класса
 */
export const toggleClass = (element: HTMLElement, className: string): void => {
    element.classList.toggle(className);
};

/**
 * Показывает элемент
 * @param element - целевой элемент
 */
export const showElement = (element: HTMLElement): void => {
    element.style.display = '';
    element.style.visibility = 'visible';
};

/**
 * Скрывает элемент
 * @param element - целевой элемент
 */
export const hideElement = (element: HTMLElement): void => {
    element.style.display = 'none';
    element.style.visibility = 'hidden';
};