import { LogLevel, LogLevelNames, LogLevelColors } from './LogLevel';

/**
 * Интерфейс для форматированного сообщения
 */
export interface FormattedLog {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  module: string;
  message: string;
  data?: any;
  fullText: string;
}

/**
 * Форматтер логов
 */
export class LogFormatter {
  private static _instance: LogFormatter;
  
  private constructor() {}

  public static getInstance(): LogFormatter {
    if (!LogFormatter._instance) {
      LogFormatter._instance = new LogFormatter();
    }
    return LogFormatter._instance;
  }

  /**
   * Форматировать лог для консоли (с цветами)
   */
  public formatConsole(
    level: LogLevel,
    module: string,
    message: string,
    data?: any
  ): string[] {
    const timestamp = this.getTimestamp();
    const levelName = LogLevelNames[level];
    const color = LogLevelColors[level];
    
    const prefix = `%c${timestamp} | ${levelName} | ${module} |`;
    const style = `color: ${color}; font-weight: bold;`;
    
    if (data !== undefined) {
      return [prefix, style, message, data];
    }
    
    return [prefix, style, message];
  }

  /**
   * Форматировать лог для файла (без цветов)
   */
  public formatFile(
    level: LogLevel,
    module: string,
    message: string,
    data?: any
  ): string {
    const timestamp = this.getTimestamp();
    const levelName = LogLevelNames[level];
    
    let result = `${timestamp} | ${levelName} | ${module} | ${message}`;
    
    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'string' 
          ? data 
          : JSON.stringify(data, null, 2);
        result += `\n${dataStr}`;
      } catch (e) {
        result += `\n[Circular or Non-serializable Data]`;
      }
    }
    
    return result;
  }

  /**
   * Форматировать лог для удалённого сервера (JSON)
   */
  public formatJSON(
    level: LogLevel,
    module: string,
    message: string,
    data?: any
  ): object {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevelNames[level],
      levelValue: level,
      module,
      message,
      data: this.sanitizeData(data),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  /**
   * Получить временную метку
   */
  private getTimestamp(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * Очистить данные от циклических ссылок
   */
  private sanitizeData(data: any): any {
    if (data === undefined || data === null) {
      return data;
    }
    
    try {
      // Пробуем сериализовать
      JSON.stringify(data);
      return data;
    } catch (e) {
      // Если не получается, возвращаем строковое представление
      return String(data);
    }
  }
}