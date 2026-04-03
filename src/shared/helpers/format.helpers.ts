/**
 * Форматирует дату в локальный формат
 * @param date - дата для форматирования
 * @param locale - локаль (по умолчанию 'ru-RU')
 * @returns отформатированная строка даты
 */
export const formatDate = (date: Date, locale: string = 'ru-RU'): string => {
    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Форматирует время в локальный формат
 * @param date - дата для форматирования
 * @param locale - локаль (по умолчанию 'ru-RU')
 * @returns отформатированная строка времени
 */
export const formatTime = (date: Date, locale: string = 'ru-RU'): string => {
    return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * Форматирует дату и время
 * @param date - дата для форматирования
 * @param locale - локаль (по умолчанию 'ru-RU')
 * @returns отформатированная строка даты и времени
 */
export const formatDateTime = (date: Date, locale: string = 'ru-RU'): string => {
    return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
};

/**
 * Форматирует число с указанным количеством знаков после запятой
 * @param num - число
 * @param decimals - количество знаков после запятой
 * @returns отформатированная строка
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
};

/**
 * Форматирует расстояние в метрах
 * @param meters - расстояние в метрах
 * @param decimals - количество знаков после запятой
 * @returns отформатированная строка с единицей измерения
 */
export const formatDistance = (meters: number, decimals: number = 1): string => {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(decimals)} км`;
    }
    return `${meters.toFixed(decimals)} м`;
};

/**
 * Обрезает текст до указанной длины и добавляет многоточие
 * @param text - исходный текст
 * @param maxLength - максимальная длина
 * @returns обрезанный текст
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

/**
 * Преобразует первую букву строки в заглавную
 * @param str - исходная строка
 * @returns строка с заглавной первой буквой
 */
export const capitalize = (str: string): string => {
    if (!str.length) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Преобразует строку в формат kebab-case
 * @param str - исходная строка
 * @returns строка в kebab-case
 */
export const toKebabCase = (str: string): string => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
};

/**
 * Преобразует строку в формат camelCase
 * @param str - исходная строка
 * @returns строка в camelCase
 */
export const toCamelCase = (str: string): string => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
};