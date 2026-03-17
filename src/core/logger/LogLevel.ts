/**
 * Уровни логирования
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Названия уровней для вывода
 */
export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '🐛 DEBUG',
  [LogLevel.INFO]: '📘 INFO',
  [LogLevel.WARN]: '⚠️ WARN',
  [LogLevel.ERROR]: '❌ ERROR',
  [LogLevel.NONE]: '🚫 NONE'
};

/**
 * Цвета для разных уровней (для консоли)
 */
export const LogLevelColors: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '#808080', // Серый
  [LogLevel.INFO]: '#00d2ff',  // Голубой
  [LogLevel.WARN]: '#ffaa00',  // Жёлтый
  [LogLevel.ERROR]: '#ff4444', // Красный
  [LogLevel.NONE]: '#000000'   // Чёрный
};