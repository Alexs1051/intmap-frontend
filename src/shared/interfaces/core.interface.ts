import { LogLevel } from "../types";

export interface ILogTransport {
    log(level: LogLevel, module: string, message: string, data?: any): void;
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
    flush?(): Promise<void>;
    dispose?(): void;
}

export interface ILogFormatter {
    formatForConsole(level: LogLevel, module: string, message: string, data?: any): [string, string, string, any?];
    formatForFile(level: LogLevel, module: string, message: string, data?: any): string;
    formatForJSON(level: LogLevel, module: string, message: string, data?: any): Record<string, any>;
    getFormattedTime(): string;
    serializeData(data: any): string;
    sanitizeData(data: any): any;
}