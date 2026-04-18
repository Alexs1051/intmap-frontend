/**
 * Получает параметр из URL query string
 * @param param - имя параметра
 * @returns значение параметра или null
 */
export const getQueryParam = (param: string): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

/**
 * Устанавливает параметр в URL query string
 * @param param - имя параметра
 * @param value - значение параметра
 */
export const setQueryParam = (param: string, value: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url.toString());
};

/**
 * Удаляет параметр из URL query string
 * @param param - имя параметра
 */
export const removeQueryParam = (param: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url.toString());
};

/**
 * Строит URL с параметрами
 * @param base - базовый URL
 * @param params - объект с параметрами
 * @returns полный URL
 */
export const buildUrl = (base: string, params: Record<string, string>): string => {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    return url.toString();
};

const CURRENT_BUILDING_REF_KEY = '__INTMAP_CURRENT_BUILDING__';

/**
 * Возвращает текущий выбранный building ref из runtime-контекста
 */
export const getCurrentBuildingRef = (): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    const value = (window as typeof window & Record<string, unknown>)[CURRENT_BUILDING_REF_KEY];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
};

/**
 * Сохраняет текущий выбранный building ref в runtime-контекст
 */
export const setCurrentBuildingRef = (buildingRef: string): void => {
    if (typeof window === 'undefined' || !buildingRef.trim()) {
        return;
    }

    (window as typeof window & Record<string, unknown>)[CURRENT_BUILDING_REF_KEY] = buildingRef.trim();
};
