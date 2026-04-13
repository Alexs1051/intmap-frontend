import { LogLevel, LOG_LEVEL_META, IFormattedLog, ITransportConfig } from "@shared/types";
import { ILogTransport } from "@shared/interfaces";
import { LogFormatter } from "./log-formatter";

export abstract class BaseTransport implements ILogTransport {
    protected level: LogLevel;
    protected formatter: LogFormatter;

    constructor(config?: ITransportConfig) {
        this.level = config?.level ?? LogLevel.DEBUG;
        this.formatter = LogFormatter.getInstance();
    }

    public abstract log(level: LogLevel, module: string, message: string, data?: any): void;

    public setLevel(level: LogLevel): void {
        this.level = level;
    }

    public getLevel(): LogLevel {
        return this.level;
    }

    protected shouldLog(level: LogLevel): boolean {
        return level >= this.level && this.level !== LogLevel.NONE;
    }
}

export class ConsoleTransport extends BaseTransport {
    public log(level: LogLevel, module: string, message: string, data?: any): void {
        if (!this.shouldLog(level)) return;

        const formatted = this.formatter.formatForConsole(level, module, message, data);

        const consoleMethod = LOG_LEVEL_META[level]?.consoleMethod || 'log';

        switch (consoleMethod) {
            case 'debug':
                console.debug(formatted[0], formatted[1], formatted[2], formatted[3] || '');
                break;
            case 'info':
                console.info(formatted[0], formatted[1], formatted[2], formatted[3] || '');
                break;
            case 'warn':
                console.warn(formatted[0], formatted[1], formatted[2], formatted[3] || '');
                break;
            case 'error':
                console.error(formatted[0], formatted[1], formatted[2], formatted[3] || '');
                break;
            default:
                console.log(formatted[0], formatted[1], formatted[2], formatted[3] || '');
        }
    }
}

export class MemoryTransport extends BaseTransport {
    private logs: IFormattedLog[] = [];
    private maxLogs: number;

    constructor(maxLogs: number = 1000, config?: ITransportConfig) {
        super(config);
        this.maxLogs = maxLogs;
    }

    public log(level: LogLevel, module: string, message: string, data?: any): void {
        if (!this.shouldLog(level)) return;

        const formatted = this.formatter.formatForFile(level, module, message, data);
        const meta = LOG_LEVEL_META[level];

        this.logs.push({
            timestamp: new Date().toISOString(),
            timestampISO: new Date().toISOString(),
            level,
            levelName: meta.name,
            module,
            message,
            data,
            fullText: formatted
        });

        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    public getLogs(): IFormattedLog[] {
        return [...this.logs];
    }

    public getJSON(): Record<string, any>[] {
        return this.logs.map(log => this.formatter.formatForJSON(
            log.level,
            log.module,
            log.message,
            log.data
        ));
    }

    public clear(): void {
        this.logs = [];
    }
}

export interface IServerTransportConfig extends ITransportConfig {
    url: string;
    batchSize?: number;
    flushInterval?: number;
    retryCount?: number;
}

export class ServerTransport extends BaseTransport {
    private url: string;
    private batchSize: number;
    private flushInterval: number;
    private retryCount: number;
    private batch: Record<string, any>[] = [];
    private timer: ReturnType<typeof setTimeout> | null = null;
    private isFlushing: boolean = false;

    constructor(config: IServerTransportConfig) {
        super(config);
        this.url = config.url;
        this.batchSize = config.batchSize ?? 10;
        this.flushInterval = config.flushInterval ?? 5000;
        this.retryCount = config.retryCount ?? 3;

        this.startTimer();
    }

    public log(level: LogLevel, module: string, message: string, data?: any): void {
        if (!this.shouldLog(level)) return;

        const logData = this.formatter.formatForJSON(level, module, message, data);
        this.batch.push(logData);

        if (this.batch.length >= this.batchSize) {
            this.flush();
        }
    }

    public async flush(): Promise<void> {
        if (this.isFlushing || this.batch.length === 0) return;

        this.isFlushing = true;
        const logsToSend = [...this.batch];
        this.batch = [];

        try {
            await this.sendWithRetry(logsToSend);
        } catch (error) {
            console.error('Failed to send logs:', error);
            this.batch.unshift(...logsToSend);
        } finally {
            this.isFlushing = false;
        }
    }

    private async sendWithRetry(logs: Record<string, any>[], attempt: number = 1): Promise<void> {
        try {
            const response = await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ logs, timestamp: Date.now() })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            if (attempt < this.retryCount) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.sendWithRetry(logs, attempt + 1);
            }
            throw error;
        }
    }

    private startTimer(): void {
        this.timer = setInterval(() => {
            if (this.batch.length > 0) {
                this.flush();
            }
        }, this.flushInterval);
    }

    public dispose(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        if (this.batch.length > 0) {
            this.flush();
        }
    }
}