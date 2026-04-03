/**
 * Основные цвета приложения
 */
export const COLORS = {
    /** Акцентный цвет (голубой) */
    PRIMARY: '#00d2ff',
    /** Вторичный акцентный цвет (синий) */
    SECONDARY: '#3a7bd5',
    /** Цвет успеха (зелёный) */
    SUCCESS: '#44ff44',
    /** Цвет ошибки (красный) */
    ERROR: '#ff4444',
    /** Цвет предупреждения (оранжевый) */
    WARNING: '#ffaa44',
    /** Цвет информации (голубой) */
    INFO: '#00d2ff',
    
    /** Тёмная тема - фон */
    DARK_BG: '#1a1a2e',
    /** Тёмная тема - карточка */
    DARK_CARD: '#16213e',
    /** Тёмная тема - текст */
    DARK_TEXT: '#ffffff',
    /** Тёмная тема - вторичный текст */
    DARK_TEXT_SECONDARY: '#aaaaaa',
    
    /** Светлая тема - фон */
    LIGHT_BG: '#f5f5fa',
    /** Светлая тема - карточка */
    LIGHT_CARD: '#ffffff',
    /** Светлая тема - текст */
    LIGHT_TEXT: '#1a1a2e',
    /** Светлая тема - вторичный текст */
    LIGHT_TEXT_SECONDARY: '#4a4a5a'
} as const;

/**
 * Цвета для градиентов
 */
export const GRADIENTS = {
    /** Акцентный градиент */
    ACCENT: 'linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%)',
    /** Градиент загрузки (тёмная тема) */
    LOADING_DARK: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    /** Градиент загрузки (светлая тема) */
    LOADING_LIGHT: 'linear-gradient(135deg, #e8e8f0 0%, #d8d8e8 100%)'
} as const;