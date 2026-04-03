/**
 * Конфигурация логирования
 * Управляет выводом и сохранением логов
 */
export interface ILoggingConfig {
    /** Уровень логирования: debug, info, warn, error */
    level: string;
    /** URL для отправки логов на сервер (опционально) */
    serverUrl?: string;
    /** Включить запись логов в файл */
    enableFileLogging?: boolean;
    /** Включить запись логов в консоль */
    enableConsoleLogging?: boolean;
    /** Максимальное количество логов в памяти */
    maxMemoryLogs?: number;
    /** Маска для отключения логов конкретных модулей */
    disabledModules?: string[];
}