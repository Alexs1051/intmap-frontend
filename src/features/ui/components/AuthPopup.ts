import { logger } from "../../../core/logger/Logger";
import '../../../styles/components/auth-popup.css';

const authLogger = logger.getLogger('AuthPopup');

export type AuthMode = 'login' | 'logout';

export interface AuthResult {
  success: boolean;
  username?: string;
  role?: string;
  error?: string;
}

export class AuthPopup {
  private _container: HTMLDivElement;
  private _isVisible: boolean = false;
  private _mode: AuthMode = 'login';
  private _onCloseCallback: (() => void) | null = null;
  private _onAuthCallback: ((result: AuthResult) => void) | null = null;
  
  // Тестовые credentials
  private readonly TEST_USER = 'test';
  private readonly TEST_PASS = 'test';
  private readonly TEST_ROLE = 'Администратор';

  constructor() {
    this.createPopup();
  }

  private createPopup(): void {
    // Затемняющий фон
    this._container = document.createElement('div');
    this._container.className = 'auth-popup-overlay';
    
    const popup = document.createElement('div');
    popup.className = 'auth-popup';

    // Заголовок
    const header = document.createElement('div');
    header.className = 'auth-popup-header';
    
    const title = document.createElement('h3');
    title.className = 'auth-popup-title';
    title.textContent = 'Авторизация';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'auth-popup-close';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => this.hide());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    popup.appendChild(header);

    // Форма
    const form = document.createElement('form');
    form.className = 'auth-popup-form';
    form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Поле логина
    const loginGroup = document.createElement('div');
    loginGroup.className = 'auth-popup-field';
    
    const loginLabel = document.createElement('label');
    loginLabel.textContent = 'Логин';
    loginLabel.htmlFor = 'auth-login';
    
    const loginInput = document.createElement('input');
    loginInput.type = 'text';
    loginInput.id = 'auth-login';
    loginInput.name = 'login';
    loginInput.placeholder = 'Введите логин';
    loginInput.required = true;
    
    loginGroup.appendChild(loginLabel);
    loginGroup.appendChild(loginInput);
    form.appendChild(loginGroup);

    // Поле пароля
    const passGroup = document.createElement('div');
    passGroup.className = 'auth-popup-field';
    
    const passLabel = document.createElement('label');
    passLabel.textContent = 'Пароль';
    passLabel.htmlFor = 'auth-password';
    
    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.id = 'auth-password';
    passInput.name = 'password';
    passInput.placeholder = 'Введите пароль';
    passInput.required = true;
    
    passGroup.appendChild(passLabel);
    passGroup.appendChild(passInput);
    form.appendChild(passGroup);

    // Кнопки
    const buttons = document.createElement('div');
    buttons.className = 'auth-popup-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'auth-popup-button cancel';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.addEventListener('click', () => this.hide());
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'auth-popup-button submit';
    submitBtn.textContent = 'Войти';
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(submitBtn);
    form.appendChild(buttons);

    popup.appendChild(form);
    this._container.appendChild(popup);
    
    document.body.appendChild(this._container);
  }

  private handleSubmit(event: Event): void {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const login = formData.get('login') as string;
    const password = formData.get('password') as string;
    
    authLogger.debug(`Попытка входа: ${login}`);
    
    if (login === this.TEST_USER && password === this.TEST_PASS) {
      authLogger.info(`Успешный вход: ${login}`);
      this._onAuthCallback?.({
        success: true,
        username: login,
        role: this.TEST_ROLE
      });
      this.hide();
    } else {
      authLogger.warn(`Неудачная попытка входа: ${login}`);
      this.showError('Неверный логин или пароль');
    }
  }

  private showError(message: string): void {
    // Удаляем старую ошибку если есть
    const oldError = this._container.querySelector('.auth-popup-error');
    if (oldError) oldError.remove();
    
    const error = document.createElement('div');
    error.className = 'auth-popup-error';
    error.textContent = message;
    
    const form = this._container.querySelector('.auth-popup-form');
    form?.insertBefore(error, form.firstChild);
    
    // Автоматически скрываем через 3 секунды
    setTimeout(() => {
      error.remove();
    }, 3000);
  }

  /**
   * Показать окно авторизации
   */
  public show(): void {
    this._isVisible = true;
    this._container.classList.add('visible');
    
    // Очищаем поля
    const form = this._container.querySelector('form') as HTMLFormElement;
    if (form) form.reset();
    
    authLogger.debug('Показано окно авторизации');
  }

  /**
   * Показать окно подтверждения выхода
   */
  public showLogoutConfirmation(): void {
    this._mode = 'logout';
    this._isVisible = true;
    
    const popup = this._container.querySelector('.auth-popup') as HTMLDivElement;
    const title = this._container.querySelector('.auth-popup-title') as HTMLHeadingElement;
    const form = this._container.querySelector('.auth-popup-form') as HTMLFormElement;
    
    title.textContent = 'Подтверждение';
    
    // Заменяем форму на confirmation
    form.innerHTML = '';
    
    const message = document.createElement('div');
    message.className = 'auth-popup-message';
    message.textContent = 'Вы действительно хотите выйти?';
    
    const buttons = document.createElement('div');
    buttons.className = 'auth-popup-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'auth-popup-button cancel';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.addEventListener('click', () => this.hide());
    
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'auth-popup-button submit';
    confirmBtn.textContent = 'Выйти';
    confirmBtn.addEventListener('click', () => {
      authLogger.info('Выход из системы');
      this._onAuthCallback?.({
        success: false,
        username: undefined,
        role: undefined
      });
      this.hide();
    });
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);
    
    form.appendChild(message);
    form.appendChild(buttons);
    
    this._container.classList.add('visible');
  }

  /**
   * Скрыть окно
   */
  public hide(): void {
    this._isVisible = false;
    this._container.classList.remove('visible');
    
    // Сбрасываем режим на login
    this._mode = 'login';
    
    // Восстанавливаем форму логина
    const popup = this._container.querySelector('.auth-popup') as HTMLDivElement;
    const title = this._container.querySelector('.auth-popup-title') as HTMLHeadingElement;
    const form = this._container.querySelector('.auth-popup-form') as HTMLFormElement;
    
    title.textContent = 'Авторизация';
    form.innerHTML = ''; // Очищаем
    this.createForm(); // Пересоздаём форму
  }

  private createForm(): void {
    const form = this._container.querySelector('.auth-popup-form') as HTMLFormElement;
    if (!form) return;

    // Поле логина
    const loginGroup = document.createElement('div');
    loginGroup.className = 'auth-popup-field';
    
    const loginLabel = document.createElement('label');
    loginLabel.textContent = 'Логин';
    loginLabel.htmlFor = 'auth-login';
    
    const loginInput = document.createElement('input');
    loginInput.type = 'text';
    loginInput.id = 'auth-login';
    loginInput.name = 'login';
    loginInput.placeholder = 'Введите логин';
    loginInput.required = true;
    
    loginGroup.appendChild(loginLabel);
    loginGroup.appendChild(loginInput);
    form.appendChild(loginGroup);

    // Поле пароля
    const passGroup = document.createElement('div');
    passGroup.className = 'auth-popup-field';
    
    const passLabel = document.createElement('label');
    passLabel.textContent = 'Пароль';
    passLabel.htmlFor = 'auth-password';
    
    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.id = 'auth-password';
    passInput.name = 'password';
    passInput.placeholder = 'Введите пароль';
    passInput.required = true;
    
    passGroup.appendChild(passLabel);
    passGroup.appendChild(passInput);
    form.appendChild(passGroup);

    // Кнопки
    const buttons = document.createElement('div');
    buttons.className = 'auth-popup-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'auth-popup-button cancel';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.addEventListener('click', () => this.hide());
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'auth-popup-button submit';
    submitBtn.textContent = 'Войти';
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(submitBtn);
    form.appendChild(buttons);
  }

  public setCloseCallback(callback: () => void): void {
    this._onCloseCallback = callback;
  }

  public setAuthCallback(callback: (result: AuthResult) => void): void {
    this._onAuthCallback = callback;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public dispose(): void {
    if (this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}