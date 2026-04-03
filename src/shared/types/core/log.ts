import { LogLevel } from "../enum/core.enum";

export interface IFormattedLog {
    timestamp: string;
    timestampISO: string;
    level: LogLevel;
    levelName: string;
    module: string;
    message: string;
    data?: any;
    fullText: string;
}

export interface IFormatOptions {
    useColors?: boolean;
    showTimestamp?: boolean;
    showLevel?: boolean;
    showModule?: boolean;
}

export interface ILoggerConfig {
    level?: LogLevel;
    defaultModule?: string;
}

export interface ITransportConfig {
    level?: LogLevel;
}