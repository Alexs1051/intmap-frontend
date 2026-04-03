import { inject, injectable } from "inversify";
import { Logger } from "../../core/logger/Logger";
import { UI } from "../../shared/constants";
import { IControlPanel } from "@shared/interfaces";
import { UIEventType, UserInfo } from "@shared/types";
import { ConfigService } from "@core/config/ConfigService";
import { TYPES } from "@core/di/Container";

/**
 * Событие панели управления
 */
interface ControlPanelEvent {
    type: UIEventType;
    [key: string]: any;
}

/**
 * Панель управления
 */
@injectable()
export class ControlPanel implements IControlPanel {
    private logger: Logger;
    private config: typeof UI.CONTROL_PANEL;
    private basePath: string;
    
    private container: HTMLDivElement;
    private buttons: Map<string, HTMLButtonElement> = new Map();
    private listeners: ((event: ControlPanelEvent) => void)[] = [];
    private buttonStates: Map<string, boolean> = new Map();
    
    private isLandscape: boolean = window.innerWidth > window.innerHeight;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.ConfigService) configService: ConfigService
    ) {
        this.logger = logger.getLogger('ControlPanel');
        this.config = UI.CONTROL_PANEL;
        this.basePath = configService.get().basePath;
        
        this.container = this.createContainer();
        this.createButtons();
        this.setupResizeListener();
        
        document.body.appendChild(this.container);
        this.logger.debug("ControlPanel created");
    }

    private getIconPath(iconName: string): string {
        return `${this.basePath}icons/${iconName}`;
    }

    public update(): void {
        // UI компонент не требует обновления
    }

    private createContainer(): HTMLDivElement {
        const container = document.createElement("div");
        container.id = 'control-panel';
        container.className = 'control-panel';
        this.updateLayout(container);
        return container;
    }

    private updateLayout(container: HTMLDivElement): void {
        this.isLandscape = window.innerWidth > window.innerHeight;
        container.classList.toggle('landscape', this.isLandscape);
        container.classList.toggle('portrait', !this.isLandscape);
    }

    private setupResizeListener(): void {
        let resizeTimeout: ReturnType<typeof setTimeout>;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const isLandscape = window.innerWidth > window.innerHeight;
                if (this.isLandscape !== isLandscape) {
                    this.updateLayout(this.container);
                }
            }, 100);
        });
    }

        private createButtons(): void {
        const buttonsConfig: Array<{
            id: string;
            defaultIcon: string;
            activeIcon?: string;
            tooltip: string;
            type: UIEventType;
        }> = [
            { id: 'floor-up', defaultIcon: this.getIconPath('circle-arrow-up.png'), tooltip: 'Следующий этаж', type: UIEventType.NEXT_FLOOR },
            { id: 'floor-down', defaultIcon: this.getIconPath('circle-arrow-down.png'), tooltip: 'Предыдущий этаж', type: UIEventType.PREV_FLOOR },
            { id: 'view', defaultIcon: this.getIconPath('layers-off.png'), activeIcon: this.getIconPath('layers.png'), tooltip: 'Этаж/Здание', type: UIEventType.TOGGLE_VIEW_MODE },
            { id: 'walls', defaultIcon: this.getIconPath('eye-off.png'), activeIcon: this.getIconPath('eye.png'), tooltip: 'Прозрачность стен', type: UIEventType.TOGGLE_WALL_TRANSPARENCY },
            { id: 'mode', defaultIcon: this.getIconPath('mode-3d.png'), activeIcon: this.getIconPath('mode-2d.png'), tooltip: 'Переключить 2D/3D', type: UIEventType.CAMERA_MODE_TOGGLE },
            { id: 'theme', defaultIcon: this.getIconPath('night.png'), activeIcon: this.getIconPath('day.png'), tooltip: 'Сменить тему', type: UIEventType.TOGGLE_THEME },
            { id: 'graph', defaultIcon: this.getIconPath('graph-off.png'), activeIcon: this.getIconPath('graph.png'), tooltip: 'Показать граф связей', type: UIEventType.TOGGLE_GRAPH },
            { id: 'reset', defaultIcon: this.getIconPath('reset.png'), tooltip: 'Сброс камеры', type: UIEventType.RESET_CAMERA },
            { id: 'search', defaultIcon: this.getIconPath('search.png'), tooltip: 'Поиск', type: UIEventType.SEARCH_TOGGLE },
            { id: 'auth', defaultIcon: this.getIconPath('lock.png'), activeIcon: this.getIconPath('lock-open.png'), tooltip: 'Не авторизован', type: UIEventType.AUTH_TOGGLE }
        ];

        buttonsConfig.forEach(config => {
            const button = this.createButton(config);
            this.buttons.set(config.id, button);
            this.container.appendChild(button);
        });

        this.logger.debug(`Created ${this.buttons.size} buttons`);
    }

    private createButton(config: { id: string; defaultIcon: string; activeIcon?: string; tooltip: string; type: UIEventType }): HTMLButtonElement {
        const button = document.createElement("button");
        button.className = 'control-panel-button';
        button.title = config.tooltip;
        
        const img = document.createElement("img");
        img.src = config.defaultIcon;
        img.alt = config.tooltip;
        img.width = this.config.BUTTON_ICON_SIZE;
        img.height = this.config.BUTTON_ICON_SIZE;
        
        button.appendChild(img);
        
        button.dataset.defaultIcon = config.defaultIcon;
        if (config.activeIcon) {
            button.dataset.activeIcon = config.activeIcon;
        }
        button.dataset.buttonId = config.id;
        
        button.addEventListener('mouseenter', () => this.onButtonHoverStart(button));
        button.addEventListener('mouseleave', () => this.onButtonHoverEnd(button));
        button.addEventListener('click', () => this.onButtonClick(config.id, config.type));
        
        const initialState = this.buttonStates.get(config.id) || false;
        this.updateButtonAppearance(button, initialState);
        
        return button;
    }

    private onButtonHoverStart(button: HTMLButtonElement): void {
        button.style.transform = 'scale(1.05)';
        button.style.transition = `transform ${this.config.ANIMATION_DURATION}s ease`;
    }

    private onButtonHoverEnd(button: HTMLButtonElement): void {
        button.style.transform = 'scale(1)';
    }

    private onButtonClick(buttonId: string, eventType: UIEventType): void {
        const isActive = this.buttonStates.get(buttonId) || false;
        this.updateButtonState(buttonId, !isActive);
        
        this.logger.debug(`Button clicked: ${eventType}, new state: ${!isActive}`);
        this.emitEvent({ type: eventType });
    }

    private updateButtonAppearance(button: HTMLButtonElement, isActive: boolean): void {
        const img = button.querySelector('img');
        if (!img) return;
        
        const defaultIcon = button.dataset.defaultIcon;
        const activeIcon = button.dataset.activeIcon;
        
        if (isActive && activeIcon) {
            img.src = activeIcon;
            button.style.background = 'rgba(100, 100, 200, 0.9)';
            button.style.boxShadow = '0 0 10px rgba(100, 100, 200, 0.5)';
            button.classList.add('active');
        } else if (defaultIcon) {
            img.src = defaultIcon;
            button.style.background = 'rgba(60, 60, 80, 0.6)';
            button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            button.classList.remove('active');
        }
    }

    private emitEvent(event: ControlPanelEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    // === Публичные методы ===

    public updateButtonState(buttonId: string, isActive: boolean): void {
        const button = this.buttons.get(buttonId);
        if (!button) {
            this.logger.warn(`Button ${buttonId} not found`);
            return;
        }
        
        this.buttonStates.set(buttonId, isActive);
        this.updateButtonAppearance(button, isActive);
    }

    public getButtonState(buttonId: string): boolean {
        return this.buttonStates.get(buttonId) || false;
    }

    public setAuthState(userInfo: UserInfo): void {
        const authButton = this.buttons.get('auth');
        if (authButton) {
            authButton.title = userInfo.isAuthenticated 
                ? `${userInfo.username} (${userInfo.role})`
                : 'Не авторизован';
            this.updateButtonState('auth', userInfo.isAuthenticated);
        }
        
        this.logger.debug(`Auth state updated: ${userInfo.isAuthenticated}`);
    }

    public updateFloorButtons(currentFloor: number, maxFloor: number): void {
        const upButton = this.buttons.get('floor-up');
        const downButton = this.buttons.get('floor-down');
        
        if (!upButton || !downButton) return;
        
        const isFloorMode = currentFloor > 0;
        
        const canGoUp = isFloorMode && currentFloor < maxFloor;
        upButton.style.opacity = canGoUp ? '1' : '0.3';
        upButton.style.pointerEvents = canGoUp ? 'auto' : 'none';
        upButton.title = canGoUp ? 'Следующий этаж' : (isFloorMode ? 'Это последний этаж' : 'Сначала включите режим этажа');
        
        const canGoDown = isFloorMode && currentFloor > 1;
        downButton.style.opacity = canGoDown ? '1' : '0.3';
        downButton.style.pointerEvents = canGoDown ? 'auto' : 'none';
        downButton.title = canGoDown ? 'Предыдущий этаж' : (isFloorMode ? 'Это первый этаж' : 'Сначала включите режим этажа');
    }

    public setGraphVisible(visible: boolean): void {
        this.updateButtonState('graph', visible);
    }

    public setDarkTheme(isDark: boolean): void {
        this.updateButtonState('theme', !isDark);
    }

    public addEventListener(listener: (event: ControlPanelEvent) => void): void {
        this.listeners.push(listener);
    }

    public removeEventListener(listener: (event: ControlPanelEvent) => void): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    public dispose(): void {
        this.listeners = [];
        this.buttons.clear();
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.logger.info("ControlPanel disposed");
    }
}