/**
 * API эндпоинты
 */
export const API_ENDPOINTS = {
    /** Здания */
    BUILDINGS: '/api/buildings',
    /** Маркеры */
    MARKERS: '/api/markers',
    /** Авторизация */
    AUTH: '/api/auth',
    /** Загрузка модели */
    MODEL: '/models/building.glb'
} as const;

/**
 * Таймауты API запросов (мс)
 */
export const API_TIMEOUTS = {
    /** Обычный запрос */
    DEFAULT: 30000,
    /** Загрузка файла */
    UPLOAD: 60000,
    /** Долгий запрос */
    LONG: 120000
} as const;

/**
 * Коды ошибок API
 */
export const API_ERROR_CODES = {
    /** Не авторизован */
    UNAUTHORIZED: 401,
    /** Доступ запрещён */
    FORBIDDEN: 403,
    /** Не найдено */
    NOT_FOUND: 404,
    /** Ошибка сервера */
    SERVER_ERROR: 500
} as const;