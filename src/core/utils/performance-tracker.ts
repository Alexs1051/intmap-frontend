import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";

/**
 * Утилита для замера времени выполнения операций
 */
@injectable()
export class PerformanceTracker {
  private logger: Logger;

  constructor(@inject(TYPES.Logger) logger: Logger) {
    this.logger = logger.getLogger('PerformanceTracker');
  }

  /**
   * Замерить время выполнения синхронной функции
   * @param name Название операции
   * @param fn Функция для выполнения
   * @param module Название модуля для логирования
   * @returns Результат выполнения функции
   */
  public measure<T>(name: string, fn: () => T, module?: string): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.logger.debug(`⏱️ ${name} completed in ${duration.toFixed(2)}ms`, { duration }, module);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.logger.error(`❌ ${name} failed after ${duration.toFixed(2)}ms`, { error, duration }, module);
      throw error;
    }
  }

  /**
   * Замерить время выполнения асинхронной функции
   * @param name Название операции
   * @param fn Асинхронная функция для выполнения
   * @param module Название модуля для логирования
   * @returns Результат выполнения функции
   */
  public async measureAsync<T>(name: string, fn: () => Promise<T>, module?: string): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.logger.debug(`⏱️ ${name} completed in ${duration.toFixed(2)}ms`, { duration }, module);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.logger.error(`❌ ${name} failed after ${duration.toFixed(2)}ms`, { error, duration }, module);
      throw error;
    }
  }
}
