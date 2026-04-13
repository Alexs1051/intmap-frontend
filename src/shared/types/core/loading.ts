/**
 * Прогресс загрузки ресурса
 */
export interface ILoadingProgress {
    /** Количество загруженных байт/элементов */
    loaded: number;
    /** Общее количество байт/элементов */
    total: number;
    /** Процент загрузки (0-100) */
    percentage: number;
    /** Описание текущей задачи загрузки */
    task: string;
}

/**
 * Состояние загрузки компонента
 */
export interface ILoadingState {
    /** Идёт ли загрузка */
    isLoading: boolean;
    /** Текущий прогресс (0-1) */
    progress: number;
    /** Текущая задача */
    currentTask: string;
    /** Ошибка загрузки (если есть) */
    error?: Error;
}