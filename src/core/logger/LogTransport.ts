import { LogLevel } from './LogLevel';
import { FormattedLog, LogFormatter } from './LogFormatter';

/**
 * Интерфейс транспорта логов
 */
export interface ILogTransport {
  log(level: LogLevel, module: string, message: string, data?: any): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

/**
 * Транспорт для вывода в консоль
 */
export class ConsoleTransport implements ILogTransport {
  private _level: LogLevel = LogLevel.DEBUG;
  private _formatter = LogFormatter.getInstance();

  constructor(level: LogLevel = LogLevel.DEBUG) {
    this._level = level;
  }

  public log(level: LogLevel, module: string, message: string, data?: any): void {
    if (level < this._level) return;

    const formatted = this._formatter.formatConsole(level, module, message, data);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted[0], formatted[1], formatted[2], formatted[3] || '');
        break;
      case LogLevel.INFO:
        console.info(formatted[0], formatted[1], formatted[2], formatted[3] || '');
        break;
      case LogLevel.WARN:
        console.warn(formatted[0], formatted[1], formatted[2], formatted[3] || '');
        break;
      case LogLevel.ERROR:
        console.error(formatted[0], formatted[1], formatted[2], formatted[3] || '');
        break;
    }
  }

  public setLevel(level: LogLevel): void {
    this._level = level;
  }

  public getLevel(): LogLevel {
    return this._level;
  }
}

/**
 * Транспорт для сохранения в память (для отправки на сервер)
 */
export class MemoryTransport implements ILogTransport {
  private _level: LogLevel = LogLevel.INFO;
  private _logs: FormattedLog[] = [];
  private _maxLogs: number = 1000;
  private _formatter = LogFormatter.getInstance();

  constructor(level: LogLevel = LogLevel.INFO, maxLogs: number = 1000) {
    this._level = level;
    this._maxLogs = maxLogs;
  }

  public log(level: LogLevel, module: string, message: string, data?: any): void {
    if (level < this._level) return;

    const formatted = this._formatter.formatFile(level, module, message, data);
    
    this._logs.push({
      timestamp: new Date().toISOString(),
      level,
      levelName: this.getLevelName(level),
      module,
      message,
      data,
      fullText: formatted
    });

    // Ограничиваем размер
    if (this._logs.length > this._maxLogs) {
      this._logs.shift();
    }
  }

  public setLevel(level: LogLevel): void {
    this._level = level;
  }

  public getLevel(): LogLevel {
    return this._level;
  }

  /**
   * Получить все логи
   */
  public getLogs(): FormattedLog[] {
    return [...this._logs];
  }

  /**
   * Очистить логи
   */
  public clear(): void {
    this._logs = [];
  }

  /**
   * Получить логи в формате JSON для отправки
   */
  public getJSON(): object[] {
    return this._logs.map(log => this._formatter.formatJSON(
      log.level,
      log.module,
      log.message,
      log.data
    ));
  }

  private getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'UNKNOWN';
    }
  }
}

/**
 * Транспорт для отправки на сервер
 */
export class ServerTransport implements ILogTransport {
  private _level: LogLevel = LogLevel.ERROR;
  private _url: string;
  private _batchSize: number = 10;
  private _batch: any[] = [];
  private _timeout: number = 5000; // ms
  private _timer: any = null;
  private _formatter = LogFormatter.getInstance();

  constructor(url: string, level: LogLevel = LogLevel.ERROR) {
    this._url = url;
    this._level = level;
  }

  public log(level: LogLevel, module: string, message: string, data?: any): void {
    if (level < this._level) return;

    const logData = this._formatter.formatJSON(level, module, message, data);
    this._batch.push(logData);

    if (this._batch.length >= this._batchSize) {
      this.flush();
    } else if (!this._timer) {
      this._timer = setTimeout(() => this.flush(), this._timeout);
    }
  }

  public setLevel(level: LogLevel): void {
    this._level = level;
  }

  public getLevel(): LogLevel {
    return this._level;
  }

  /**
   * Отправить накопленные логи на сервер
   */
  private async flush(): Promise<void> {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (this._batch.length === 0) return;

    const logsToSend = [...this._batch];
    this._batch = [];

    try {
      await fetch(this._url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend })
      });
    } catch (e) {
      // Не используем логгер чтобы избежать цикла
      console.error('Failed to send logs to server:', e);
    }
  }
}