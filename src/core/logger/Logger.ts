import { injectable } from "inversify";
import * as types from "@shared/types";
import { ILogTransport } from "@shared/interfaces";
import { ConsoleTransport, MemoryTransport } from "./LogTransport";

@injectable()
export class Logger {
    private static instance: Logger;
    private transports: ILogTransport[] = [];
    private defaultLevel: types.LogLevel = types.LogLevel.INFO;
    private defaultModule: string = 'App';
    private moduleLoggers: Map<string, Logger> = new Map();
    private static disabledModules: Set<string> = new Set();

    constructor(config?: types.ILoggerConfig) {
        if (config) {
            this.configure(config);
        } else {
            this.transports.push(new ConsoleTransport({ level: types.LogLevel.DEBUG }));
            this.transports.push(new MemoryTransport(1000, { level: types.LogLevel.INFO }));
        }
    }

    public static getInstance(config?: types.ILoggerConfig): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }

    public static disableLogger(module: string): void {
        Logger.disabledModules.add(module);
    }

    public static enableLogger(module: string): void {
        Logger.disabledModules.delete(module);
    }

    private isModuleEnabled(module: string): boolean {
        return !Logger.disabledModules.has(module);
    }

    public getLogger(module: string): Logger {
        if (!this.isModuleEnabled(module)) {
            return this.createSilentLogger(module);
        }

        if (this.moduleLoggers.has(module)) {
            return this.moduleLoggers.get(module)!;
        }

        const moduleLogger = new Logger();
        moduleLogger.transports = this.transports;
        moduleLogger.defaultModule = module;
        moduleLogger.defaultLevel = this.defaultLevel;

        this.moduleLoggers.set(module, moduleLogger);
        return moduleLogger;
    }

    private createSilentLogger(module: string): Logger {
        const silentLogger = new Logger();
        silentLogger.transports = [];
        silentLogger.defaultModule = module;

        silentLogger.debug = () => { };
        silentLogger.info = () => { };
        silentLogger.warn = () => { };
        silentLogger.error = () => { };
        silentLogger.fatal = () => { };

        return silentLogger;
    }

    public configure(config: types.ILoggerConfig): void {
        if (config.level !== undefined) {
            this.defaultLevel = config.level;
        }

        if (config.defaultModule !== undefined) {
            this.defaultModule = config.defaultModule;
        }
    }

    public addTransport(transport: ILogTransport): void {
        this.transports.push(transport);
    }

    public clearTransports(): void {
        this.transports = [];
    }

    public setLevel(level: types.LogLevel): void {
        this.defaultLevel = level;
        this.transports.forEach(t => t.setLevel(level));
    }

    public debug(message: string, data?: any, module?: string): void {
        this.log(types.LogLevel.DEBUG, message, data, module);
    }

    public info(message: string, data?: any, module?: string): void {
        this.log(types.LogLevel.INFO, message, data, module);
    }

    public warn(message: string, data?: any, module?: string): void {
        this.log(types.LogLevel.WARN, message, data, module);
    }

    public error(message: string, data?: any, module?: string): void {
        this.log(types.LogLevel.ERROR, message, data, module);
    }

    public fatal(message: string, data?: any, module?: string): void {
        this.log(types.LogLevel.FATAL, message, data, module);
    }

    private log(level: types.LogLevel, message: string, data?: any, module?: string): void {
        const moduleName = module || this.defaultModule;

        if (!this.isModuleEnabled(moduleName)) return;

        this.transports.forEach(transport => {
            try {
                transport.log(level, moduleName, message, data);
            } catch (error) {
                console.error('Logger transport error:', error);
            }
        });
    }

    public static forModule(module: string, config?: types.ILoggerConfig): Logger {
        const mainLogger = Logger.getInstance(config);
        return mainLogger.getLogger(module);
    }

    public measureTime<T>(name: string, fn: () => T, module?: string): T {
        const start = performance.now();
        try {
            const result = fn();
            const duration = performance.now() - start;
            this.debug(`⏱️ ${name} completed in ${duration.toFixed(2)}ms`, { duration }, module);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`❌ ${name} failed after ${duration.toFixed(2)}ms`, { error, duration }, module);
            throw error;
        }
    }

    public async measureTimeAsync<T>(name: string, fn: () => Promise<T>, module?: string): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.debug(`⏱️ ${name} completed in ${duration.toFixed(2)}ms`, { duration }, module);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`❌ ${name} failed after ${duration.toFixed(2)}ms`, { error, duration }, module);
            throw error;
        }
    }

    public group(name: string, fn: () => void, module?: string): void {
        const moduleName = module || this.defaultModule;
        console.group(`📁 ${moduleName} | ${name}`);
        try {
            fn();
        } finally {
            console.groupEnd();
        }
    }

    public dispose(): void {
        this.transports.forEach(transport => {
            if (transport.dispose) {
                transport.dispose();
            }
        });
        this.transports = [];
        this.moduleLoggers.clear();
    }
}

export const logger = Logger.getInstance({
    defaultModule: 'App'
});

// Отключаем логирование для большинства модулей, оставляем только маркеры
Logger.disableLogger('ConfigService');
Logger.disableLogger('BuildingManager');
Logger.disableLogger('BuildingParser');
Logger.disableLogger('Camera Controller');
Logger.disableLogger('CameraInputHandler');
Logger.disableLogger('Scene Controller');
Logger.disableLogger('UI Manager');
Logger.disableLogger('SearchBar');
Logger.disableLogger('ControlPanel');
Logger.disableLogger('MarkerParser');
Logger.disableLogger('MarkerGraphRenderer');
Logger.disableLogger('Marker Graph Renderer');
Logger.disableLogger('Marker Graph');
Logger.disableLogger('Path Finder');
Logger.disableLogger('EventBus');
Logger.disableLogger('App');

export { LogLevel } from "@shared/types";