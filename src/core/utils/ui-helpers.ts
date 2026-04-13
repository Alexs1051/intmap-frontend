/**
 * Показать критическую ошибку через div#app-error из index.html
 * @param message Текст ошибки
 * @param duration Время показа (мс). 0 = не скрывать
 */
export function showCriticalError(message: string, duration: number = 8000): void {
  const errorEl = document.getElementById('app-error');
  const messageEl = document.getElementById('error-message');

  if (!errorEl || !messageEl) {
    console.error('Error display elements not found');
    return;
  }

  messageEl.textContent = message;
  errorEl.classList.remove('hidden');

  if (duration > 0) {
    setTimeout(() => hideCriticalError(), duration);
  }
}

/**
 * Скрыть ошибку
 */
export function hideCriticalError(): void {
  const errorEl = document.getElementById('app-error');
  if (errorEl) {
    errorEl.classList.add('hidden');
  }
}

/**
 * Обновить debug элемент
 */
export function updateDebug(message: string): void {
  const debug = document.getElementById('debug');
  if (debug) {
    debug.innerHTML = message;
  }
}
