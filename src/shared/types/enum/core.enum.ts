export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4,
    NONE = 5
}

export enum EnvironmentType {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production',
    TEST = 'test'
}

export enum ErrorType {
    NETWORK = 'NETWORK_ERROR',
    VALIDATION = 'VALIDATION_ERROR',
    NOT_FOUND = 'NOT_FOUND_ERROR',
    AUTH = 'AUTH_ERROR',
    LOADING = 'LOADING_ERROR',
    UNKNOWN = 'UNKNOWN_ERROR'
}

export enum EventPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    CRITICAL = 3
}

export enum CacheStrategy {
    NONE = 'none',
    MEMORY = 'memory',
    PERSISTENT = 'persistent'
}

export enum ConnectionStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
    CONNECTING = 'connecting',
    ERROR = 'error'
}

export const LOG_LEVEL_META: Record<LogLevel, { name: string; color: string; consoleMethod: 'debug' | 'info' | 'warn' | 'error' }> = {
    [LogLevel.DEBUG]: { name: 'DEBUG', color: '#808080', consoleMethod: 'debug' },
    [LogLevel.INFO]: { name: 'INFO', color: '#00d2ff', consoleMethod: 'info' },
    [LogLevel.WARN]: { name: 'WARN', color: '#ffaa00', consoleMethod: 'warn' },
    [LogLevel.ERROR]: { name: 'ERROR', color: '#ff4444', consoleMethod: 'error' },
    [LogLevel.FATAL]: { name: 'FATAL', color: '#ff0000', consoleMethod: 'error' },
    [LogLevel.NONE]: { name: 'NONE', color: '#000000', consoleMethod: 'debug' }
};