import { injectable } from "inversify";
import { EventType, IEvent } from "./event-types";

/**
 * Тип для функции-обработчика события
 */
type EventHandler<T = any> = (event: IEvent<T>) => void;

/**
 * Обёртка обработчика с флагом once
 */
interface IHandlerWrapper {
  handler: EventHandler;
  once: boolean;
}

/**
 * Шина событий - реализует паттерн Observer
 * Позволяет компонентам общаться без прямой зависимости
 */
@injectable()
export class EventBus {
  private handlers: Map<EventType, Set<IHandlerWrapper>> = new Map();
  private debugMode: boolean = false;

  constructor() {
    // Включаем debug режим только если явно указано в URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      this.debugMode = urlParams.get('debug-events') === 'true';

      // Также можно включить через localStorage
      if (localStorage.getItem('debug-events') === 'true') {
        this.debugMode = true;
      }
    }
  }

  /**
   * Включить/выключить режим отладки
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Подписаться на событие
   * @param type Тип события
   * @param handler Функция-обработчик
   * @returns Функция для отписки
   */
  public on<T = any>(type: EventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    const wrapper: IHandlerWrapper = { handler: handler as EventHandler, once: false };
    this.handlers.get(type)!.add(wrapper);

    // Возвращаем функцию для отписки
    return () => this.off(type, handler);
  }

  /**
   * Подписаться на событие однократно
   * @param type Тип события
   * @param handler Функция-обработчик
   * @returns Функция для отписки
   */
  public once<T = any>(type: EventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    const wrapper: IHandlerWrapper = { handler: handler as EventHandler, once: true };
    this.handlers.get(type)!.add(wrapper);

    return () => this.off(type, handler);
  }

  /**
   * Отписаться от события
   * @param type Тип события
   * @param handler Функция-обработчик
   */
  public off(type: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const toRemove = Array.from(handlers).find(w => w.handler === handler);
      if (toRemove) {
        handlers.delete(toRemove);
        if (handlers.size === 0) {
          this.handlers.delete(type);
        }
      }
    }
  }

  /**
   * Отписаться от всех событий определенного типа
   */
  public offAll(type?: EventType): void {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Вызвать событие
   * @param type Тип события
   * @param data Данные события
   * @param source Источник события (опционально)
   */
  public emit<T = any>(type: EventType, data?: T, source?: string): void {
    const event: IEvent<T> = {
      type,
      data: data as T,
      timestamp: Date.now(),
      source
    };

    // Логируем только важные события или если включен debug режим
    if (this.debugMode || this.shouldLogEvent(type)) {
      console.debug(`[EventBus] ${type}`, event);
    }

    // Получаем обработчики
    const handlers = this.handlers.get(type);
    if (!handlers || handlers.size === 0) return;

    // Копируем для безопасного удаления во время итерации
    const handlersCopy = Array.from(handlers);
    const toRemove: IHandlerWrapper[] = [];

    // Вызываем обработчики
    handlersCopy.forEach(wrapper => {
      try {
        wrapper.handler(event);
        // Если once - помечаем для удаления
        if (wrapper.once) {
          toRemove.push(wrapper);
        }
      } catch (error) {
        console.error(`Error in event handler for ${type}:`, error);
      }
    });

    // Удаляем once обработчики
    toRemove.forEach(wrapper => handlers.delete(wrapper));
  }

  /**
   * Определить, нужно ли логировать событие
   */
  private shouldLogEvent(type: EventType): boolean {
    // Логируем только критические события
    const criticalEvents = [
      EventType.LOADING_ERROR,
      EventType.ERROR_OCCURRED,
      EventType.CONNECTION_STATUS_CHANGED
    ];
    return criticalEvents.includes(type);
  }

  /**
   * Проверить, есть ли подписчики на событие
   */
  public hasListeners(type: EventType): boolean {
    return this.handlers.has(type) && this.handlers.get(type)!.size > 0;
  }

  /**
   * Получить количество подписчиков на событие
   */
  public listenerCount(type: EventType): number {
    return this.handlers.get(type)?.size || 0;
  }
}
