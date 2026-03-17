import { LogLevel } from './LogLevel';
import { ILogTransport, ConsoleTransport, MemoryTransport, ServerTransport } from './LogTransport';

/**
 * Интерфейс для конфигурации логгера
 */
export interface LoggerConfig {
  level?: LogLevel;
  enableConsole?: boolean;
  enableMemory?: boolean;
  serverUrl?: string;
  module?: string;
}

/**
 * Главный класс логгера
 */
export class Logger {
  private static _instance: Logger;
  private _transports: ILogTransport[] = [];
  private _defaultLevel: LogLevel = LogLevel.INFO;
  private _defaultModule: string = 'App';
  
  // Кэш для модульных логгеров
  private _moduleLoggers: Map<string, Logger> = new Map();

  private constructor(config?: LoggerConfig) {
    if (config) {
      this.configure(config);
    } else {
      // Настройки по умолчанию
      this._transports.push(new ConsoleTransport(LogLevel.DEBUG));
      this._transports.push(new MemoryTransport(LogLevel.INFO));
    }
  }

  /**
   * Получить экземпляр логгера
   */
  public static getInstance(config?: LoggerConfig): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger(config);
    }
    return Logger._instance;
  }

  /**
   * Получить логгер для конкретного модуля
   */
  public getLogger(module: string): Logger {
    if (this._moduleLoggers.has(module)) {
      return this._moduleLoggers.get(module)!;
    }

    const moduleLogger = new Logger();
    moduleLogger._transports = this._transports;
    moduleLogger._defaultModule = module;
    moduleLogger._defaultLevel = this._defaultLevel;
    
    this._moduleLoggers.set(module, moduleLogger);
    return moduleLogger;
  }

  /**
   * Настроить логгер
   */
  public configure(config: LoggerConfig): void {
    this._transports = [];
    
    if (config.level !== undefined) {
      this._defaultLevel = config.level;
    }
    
    if (config.module !== undefined) {
      this._defaultModule = config.module;
    }
    
    if (config.enableConsole !== false) {
      this._transports.push(new ConsoleTransport(this._defaultLevel));
    }
    
    if (config.enableMemory) {
      this._transports.push(new MemoryTransport(this._defaultLevel));
    }
    
    if (config.serverUrl) {
      this._transports.push(new ServerTransport(config.serverUrl, LogLevel.ERROR));
    }
  }

  /**
   * Добавить транспорт
   */
  public addTransport(transport: ILogTransport): void {
    this._transports.push(transport);
  }

  /**
   * Удалить все транспорты
   */
  public clearTransports(): void {
    this._transports = [];
  }

  /**
   * Установить уровень для всех транспортов
   */
  public setLevel(level: LogLevel): void {
    this._defaultLevel = level;
    this._transports.forEach(t => t.setLevel(level));
  }

  // === Основные методы логирования ===

  public debug(message: string, data?: any, module?: string): void {
    this.log(LogLevel.DEBUG, message, data, module);
  }

  public info(message: string, data?: any, module?: string): void {
    this.log(LogLevel.INFO, message, data, module);
  }

  public warn(message: string, data?: any, module?: string): void {
    this.log(LogLevel.WARN, message, data, module);
  }

  public error(message: string, data?: any, module?: string): void {
    this.log(LogLevel.ERROR, message, data, module);
  }

  /**
   * Базовый метод логирования
   */
  private log(level: LogLevel, message: string, data?: any, module?: string): void {
    const moduleName = module || this._defaultModule;
    
    this._transports.forEach(transport => {
      try {
        transport.log(level, moduleName, message, data);
      } catch (e) {
        // Пытаемся не сломать приложение из-за логгера
        console.error('Logger transport error:', e);
      }
    });
  }

  // === Утилиты ===

  /**
   * Создать логгер для модуля
   */
  public static forModule(module: string, config?: LoggerConfig): Logger {
    const mainLogger = Logger.getInstance(config);
    return mainLogger.getLogger(module);
  }

  /**
   * Замерить время выполнения функции
   */
  public async measureTime<T>(
    name: string,
    fn: () => Promise<T>,
    module?: string
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.debug(`⏱️ ${name} завершено за ${duration.toFixed(2)}ms`, { duration }, module);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`❌ ${name} упало через ${duration.toFixed(2)}ms`, { error, duration }, module);
      throw error;
    }
  }

  /**
   * Создать группу логов
   */
  public group(name: string, fn: () => void, module?: string): void {
    const moduleName = module || this._defaultModule;
    console.group(`📁 ${moduleName} | ${name}`);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }
}

// Создаём и экспортируем синглтон по умолчанию
export const logger = Logger.getInstance({
  enableConsole: true,
  enableMemory: true,
  level: LogLevel.DEBUG
});