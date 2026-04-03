/**
 * Параметры пагинации запроса
 */
export interface IPaginationParams {
    /** Номер страницы (начиная с 1) */
    page: number;
    /** Размер страницы */
    limit: number;
    /** Поле для сортировки */
    sortBy?: string;
    /** Порядок сортировки */
    sortOrder?: 'asc' | 'desc';
}

/**
 * Результат пагинации
 */
export interface IPaginationResult<T> {
    /** Данные текущей страницы */
    data: T[];
    /** Общее количество элементов */
    total: number;
    /** Номер текущей страницы */
    page: number;
    /** Размер страницы */
    limit: number;
    /** Общее количество страниц */
    totalPages: number;
    /** Есть ли следующая страница */
    hasNext: boolean;
    /** Есть ли предыдущая страница */
    hasPrev: boolean;
}