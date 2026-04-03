import { LogLevel, LOG_LEVEL_META } from "@shared/types";
import { ILogFormatter } from "@shared/interfaces";

export class LogFormatter implements ILogFormatter {
    private static instance: LogFormatter;
    
    private constructor() {}

    public static getInstance(): LogFormatter {
        if (!LogFormatter.instance) {
            LogFormatter.instance = new LogFormatter();
        }
        return LogFormatter.instance;
    }

    public formatForConsole(
        level: LogLevel,
        module: string,
        message: string,
        data?: any
    ): [string, string, string, any?] {
        const timestamp = this.getFormattedTime();
        const meta = LOG_LEVEL_META[level];
        const prefix = `%c${timestamp} | ${meta.name} | ${module} |`;
        const style = `color: ${meta.color}; font-weight: bold;`;
        
        if (data !== undefined) {
            return [prefix, style, message, data];
        }
        
        return [prefix, style, message];
    }

    public formatForFile(
        level: LogLevel,
        module: string,
        message: string,
        data?: any
    ): string {
        const timestamp = this.getFormattedTime();
        const meta = LOG_LEVEL_META[level];
        
        let result = `${timestamp} | ${meta.name} | ${module} | ${message}`;
        
        if (data !== undefined) {
            const dataStr = this.serializeData(data);
            result += `\n${dataStr}`;
        }
        
        return result;
    }

    public formatForJSON(
        level: LogLevel,
        module: string,
        message: string,
        data?: any
    ): Record<string, any> {
        const meta = LOG_LEVEL_META[level];
        
        return {
            timestamp: new Date().toISOString(),
            level: meta.name,
            levelValue: level,
            module,
            message,
            data: this.sanitizeData(data),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'unknown'
        };
    }

    public getFormattedTime(): string {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        
        return `${hours}:${minutes}:${seconds}.${ms}`;
    }

    public serializeData(data: any): string {
        try {
            return JSON.stringify(data, null, 2);
        } catch (e) {
            return String(data);
        }
    }

    public sanitizeData(data: any): any {
        if (data === undefined || data === null) {
            return data;
        }
        
        try {
            JSON.stringify(data);
            return data;
        } catch (e) {
            return {
                _error: 'Circular reference detected',
                _stringValue: String(data)
            };
        }
    }
}