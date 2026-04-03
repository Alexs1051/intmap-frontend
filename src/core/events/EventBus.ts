import { injectable } from "inversify";
import { EventType, IEvent } from "./EventTypes";

/**
 * Тип для функции-обработчика события
 */
type EventHandler<T = any> = (event: IEvent<T>) => void;

/**
 * Шина событий - реализует паттерн Observer
 * Позволяет компонентам общаться без прямой зависимости
 */
@injectable()
export class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();
  private onceHandlers: Map<EventType, Set<EventHandler>> = new Map();
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
    
    if (this.debugMode) {
      console.log('[EventBus] Debug mode enabled');
    }
  }

  /**
   * Включить/выключить режим отладки
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (enabled) {
      console.log('[EventBus] Debug mode enabled');
    }
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
    
    this.handlers.get(type)!.add(handler as EventHandler);
    
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
    if (!this.onceHandlers.has(type)) {
      this.onceHandlers.set(type, new Set());
    }
    
    this.onceHandlers.get(type)!.add(handler as EventHandler);
    
    return () => this.offOnce(type, handler);
  }

  /**
   * Отписаться от события
   * @param type Тип события
   * @param handler Функция-обработчик
   */
  public off(type: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  /**
   * Отписаться от однократного события
   */
  private offOnce(type: EventType, handler: EventHandler): void {
    const handlers = this.onceHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.onceHandlers.delete(type);
      }
    }
  }

  /**
   * Отписаться от всех событий определенного типа
   */
  public offAll(type?: EventType): void {
    if (type) {
      this.handlers.delete(type);
      this.onceHandlers.delete(type);
    } else {
      this.handlers.clear();
      this.onceHandlers.clear();
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
    
    // Вызываем постоянные обработчики
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${type}:`, error);
        }
      });
    }
    
    // Вызываем однократные обработчики
    const onceHandlers = this.onceHandlers.get(type);
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in once event handler for ${type}:`, error);
        }
      });
      this.onceHandlers.delete(type);
    }
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
    const hasHandlers = this.handlers.has(type) && this.handlers.get(type)!.size > 0;
    const hasOnceHandlers = this.onceHandlers.has(type) && this.onceHandlers.get(type)!.size > 0;
    return hasHandlers || hasOnceHandlers;
  }

  /**
   * Получить количество подписчиков на событие
   */
  public listenerCount(type: EventType): number {
    const handlersCount = this.handlers.get(type)?.size || 0;
    const onceHandlersCount = this.onceHandlers.get(type)?.size || 0;
    return handlersCount + onceHandlersCount;
  }
}