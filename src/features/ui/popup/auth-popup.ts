import { injectable } from "inversify";
import { Logger } from "@core/logger/logger";
import { UI } from "@shared/constants";
import { IAuthPopup } from "@shared/interfaces";
import { AuthResult } from "@shared/types";

/**
 * Окно авторизации
 */
@injectable()
export class AuthPopup implements IAuthPopup {
  private logger: Logger;
  private config: typeof UI.AUTH_POPUP;

  private container!: HTMLDivElement;
  private popup!: HTMLDivElement;
  private _isVisible: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onAuthCallback: ((result: AuthResult) => void) | null = null;

  constructor(
    logger: Logger) {
    this.logger = logger.getLogger('AuthPopup');
    this.config = UI.AUTH_POPUP;

    this.createPopup();
    this.setupOutsideClick();
    this.logger.debug("AuthPopup created");
  }

  public update(): void {
    // UI компонент не требует обновления
  }

  private createPopup(): void {
    this.container = document.createElement('div');
    this.container.className = 'auth-popup-overlay';

    this.popup = document.createElement('div');
    this.popup.className = 'auth-popup';
    this.container.appendChild(this.popup);

    document.body.appendChild(this.container);
  }

  private setupOutsideClick(): void {
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.hide();
      }
    });
  }

  private createLoginForm(): void {
    this.popup.innerHTML = '';

    const header = this.createHeader();
    const form = this.createLoginFormFields();

    this.popup.appendChild(header);
    this.popup.appendChild(form);
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'auth-popup-header';

    const title = document.createElement('h3');
    title.className = 'auth-popup-title';
    title.innerHTML = `<i class="fa-solid fa-lock"></i> ${this.config.TITLE}`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'auth-popup-close';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeBtn);

    return header;
  }

  private createLoginFormFields(): HTMLFormElement {
    const form = document.createElement('form');
    form.className = 'auth-popup-form';
    form.addEventListener('submit', (e) => this.handleLoginSubmit(e));

    const loginGroup = this.createFieldGroup('login', this.config.LOGIN_LABEL, this.config.LOGIN_PLACEHOLDER, 'text');
    const passGroup = this.createFieldGroup('password', this.config.PASSWORD_LABEL, this.config.PASSWORD_PLACEHOLDER, 'password');
    const buttons = this.createFormButtons();

    form.appendChild(loginGroup);
    form.appendChild(passGroup);
    form.appendChild(buttons);

    return form;
  }

  private createFieldGroup(id: string, label: string, placeholder: string, type: string): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'auth-popup-field';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.htmlFor = `auth-${id}`;

    const input = document.createElement('input');
    input.type = type;
    input.id = `auth-${id}`;
    input.name = id;
    input.placeholder = placeholder;
    input.required = true;

    group.appendChild(labelEl);
    group.appendChild(input);

    return group;
  }

  private createFormButtons(): HTMLDivElement {
    const buttons = document.createElement('div');
    buttons.className = 'auth-popup-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'auth-popup-button cancel';
    cancelBtn.textContent = this.config.CANCEL_BUTTON_TEXT;
    cancelBtn.addEventListener('click', () => this.hide());

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'auth-popup-button submit';
    submitBtn.textContent = this.config.SUBMIT_BUTTON_TEXT;

    buttons.appendChild(cancelBtn);
    buttons.appendChild(submitBtn);

    return buttons;
  }

  private createLogoutForm(): void {
    this.popup.innerHTML = '';

    const header = this.createHeader();
    const title = header.querySelector('.auth-popup-title') as HTMLHeadingElement;
    title.innerHTML = '<i class="fa-solid fa-question-circle"></i> Подтверждение';

    const form = document.createElement('div');
    form.className = 'auth-popup-form';

    const message = document.createElement('div');
    message.className = 'auth-popup-message';
    message.textContent = this.config.LOGOUT_CONFIRM_TEXT;

    const buttons = document.createElement('div');
    buttons.className = 'auth-popup-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'auth-popup-button cancel';
    cancelBtn.textContent = this.config.CANCEL_BUTTON_TEXT;
    cancelBtn.addEventListener('click', () => this.hide());

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'auth-popup-button submit';
    confirmBtn.textContent = this.config.LOGOUT_BUTTON_TEXT;
    confirmBtn.addEventListener('click', () => {
      this.logger.info('Logout confirmed');
      this.onAuthCallback?.({
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

    this.popup.appendChild(header);
    this.popup.appendChild(form);
  }

  private handleLoginSubmit(event: Event): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const login = formData.get('login') as string;
    const password = formData.get('password') as string;

    this.logger.debug(`Login attempt: ${login}`);

    if (login === this.config.TEST_USER && password === this.config.TEST_PASS) {
      this.logger.info(`Login success: ${login}`);
      this.onAuthCallback?.({
        success: true,
        username: login,
        role: this.config.TEST_ROLE
      });
      this.hide();
    } else {
      this.logger.warn(`Login failed: ${login}`);
      this.showError('Неверный логин или пароль');
    }
  }

  private showError(message: string): void {
    const oldError = this.container.querySelector('.auth-popup-error');
    if (oldError) oldError.remove();

    const error = document.createElement('div');
    error.className = 'auth-popup-error';
    error.textContent = message;

    const form = this.popup.querySelector('.auth-popup-form');
    if (form) {
      form.insertBefore(error, form.firstChild);
    }

    setTimeout(() => {
      error.remove();
    }, 3000);
  }

  public show(): void {
    this._isVisible = true;
    this.createLoginForm();
    this.container.classList.add('visible');
    this.logger.debug("Auth popup shown");
  }

  public showLogoutConfirmation(): void {
    this._isVisible = true;
    this.createLogoutForm();
    this.container.classList.add('visible');
    this.logger.debug("Logout confirmation shown");
  }

  public hide(): void {
    this._isVisible = false;
    this.container.classList.remove('visible');
    this.onCloseCallback?.();
    this.logger.debug("Auth popup hidden");
  }

  public setAuthCallback(callback: (result: AuthResult) => void): void {
    this.onAuthCallback = callback;
  }

  public setCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.logger.info("AuthPopup disposed");
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }
}