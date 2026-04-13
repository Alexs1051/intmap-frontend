import { injectable } from "inversify";
import { IAppConfig } from "@shared/types";
import { CONFIG_DEFAULTS } from "@shared/constants";
import { Logger } from "@core/logger/logger";

@injectable()
export class ConfigService {
  private config: IAppConfig;

  constructor() {
    const windowConfig = (window as any).__CONFIG__;
    this.config = this.mergeConfig(CONFIG_DEFAULTS, windowConfig || {});

    this.logConfig();
  }

  /**
   * Глубокое слияние конфигураций
   */
  private mergeConfig(defaults: any, overrides: any): any {
    if (!defaults || typeof defaults !== 'object') {
      return overrides ?? defaults;
    }

    const result = { ...defaults };

    for (const key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        const defaultValue = result[key];
        const overrideValue = overrides[key];

        if (typeof overrideValue === 'object' && overrideValue !== null && !Array.isArray(overrideValue)) {
          result[key] = this.mergeConfig(defaultValue, overrideValue);
        } else {
          result[key] = overrideValue;
        }
      }
    }

    return result;
  }

  /**
   * Получить полную конфигурацию
   */
  public get(): IAppConfig {
    return this.config;
  }

  /**
   * Получить секцию конфигурации
   */
  public getSection<T extends keyof IAppConfig>(section: T): IAppConfig[T] {
    return this.config[section];
  }

  /**
   * Получить значение по пути (например, 'camera.zoomSpeed')
   */
  public getValue<T = any>(path: string, defaultValue?: T): T {
    const parts = path.split('.');
    let result: any = this.config;

    for (const part of parts) {
      if (result === undefined || result === null) {
        return defaultValue as T;
      }
      result = result[part];
    }

    return (result !== undefined ? result : defaultValue) as T;
  }

  /**
   * Обновить конфигурацию
   */
  public update(updates: Partial<IAppConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.logConfig();
  }

  /**
   * Обновить секцию
   */
  public updateSection<T extends keyof IAppConfig>(section: T, updates: Partial<IAppConfig[T]>): void {
    // ✅ Исправлено: проверяем, что секция существует и является объектом
    const currentSection = this.config[section];

    if (currentSection && typeof currentSection === 'object' && !Array.isArray(currentSection)) {
      this.config[section] = { ...currentSection, ...updates } as IAppConfig[T];
    } else {
      this.config[section] = updates as IAppConfig[T];
    }
  }

  /**
   * Проверить, включен ли режим отладки
   */
  public isDebug(): boolean {
    return this.config.debug;
  }

  /**
   * Логирование текущей конфигурации
   */
  private logConfig(): void {
    if (this.config.debug) {
      Logger.getInstance().getLogger('ConfigService').debug('Configuration loaded:', {
        version: this.config.version,
        environment: this.config.environment,
        debug: this.config.debug,
        modelUrl: this.config.modelUrl
      });
    }
  }

  /**
   * Проверить, является ли окружение production
   */
  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Проверить, является ли окружение development
   */
  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }
}