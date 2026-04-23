import { inject, injectable } from "inversify";
import { Logger } from "@core/logger/logger";
import { UI } from "@shared/constants";
import { IControlPanel } from "@shared/interfaces";
import { UIEventType, UserInfo } from "@shared/types";
import { TYPES } from "@core/di/container";

interface ControlPanelEvent {
    type: UIEventType;
    floor?: number;
    [key: string]: any;
}

type GroupId = 'camera' | 'building' | 'settings';

interface ActionButtonConfig {
    id: string;
    defaultIcon: string;
    activeIcon?: string;
    tooltip: string;
    type: UIEventType;
    togglesState?: boolean;
}

@injectable()
export class ControlPanel implements IControlPanel {
    private logger: Logger;
    private config: typeof UI.CONTROL_PANEL;

    private container: HTMLDivElement;
    private accessBadge: HTMLDivElement;
    private track: HTMLDivElement;
    private floorOverlay: HTMLDivElement;
    private floorList: HTMLDivElement;

    private buttons: Map<string, HTMLButtonElement> = new Map();
    private groupButtons: Map<GroupId, HTMLButtonElement> = new Map();
    private groupSlots: Map<GroupId, HTMLDivElement> = new Map();
    private groupPanels: Map<GroupId, HTMLDivElement> = new Map();
    private staticSlots: Map<string, HTMLDivElement> = new Map();
    private buildingNestedSlot?: HTMLDivElement;
    private buildingNestedPanel?: HTMLDivElement;
    private listeners: ((event: ControlPanelEvent) => void)[] = [];
    private buttonStates: Map<string, boolean> = new Map();
    private buttonsDisabled: boolean = false;
    private explicitlyDisabledButtons: Set<string> = new Set();
    private activeGroup: GroupId | null = null;
    private floorSubgroupOpen: boolean = false;
    private floorOverlayOpen: boolean = false;
    private accessibleFloors: number[] = [];
    private currentFloor: number = 0;
    private readonly isMobileDevice: boolean;

    private isLandscape: boolean = window.innerWidth > window.innerHeight;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
    ) {
        this.logger = logger.getLogger('ControlPanel');
        this.config = UI.CONTROL_PANEL;
        this.isMobileDevice = this.detectMobileDevice();

        this.container = this.createContainer();
        this.track = document.createElement('div');
        this.track.className = 'control-panel-track';

        this.accessBadge = document.createElement('div');
        this.accessBadge.className = 'control-panel-access ui-status-pill access-guest';
        this.accessBadge.textContent = 'ROLE: guest';

        this.floorOverlay = this.createFloorOverlay();
        this.floorList = this.floorOverlay.querySelector('.control-panel-floor-list') as HTMLDivElement;

        this.container.appendChild(this.track);
        this.container.appendChild(this.accessBadge);

        this.createButtons();
        this.createSlots();
        this.renderPanels();
        this.setupResizeListener();

        document.body.appendChild(this.container);
        document.body.appendChild(this.floorOverlay);
        this.logger.debug("ControlPanel created");
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

    private createFloorOverlay(): HTMLDivElement {
        const overlay = document.createElement('div');
        overlay.className = 'control-panel-floor-overlay ui-modal-overlay';

        const backdrop = document.createElement('div');
        backdrop.className = 'control-panel-floor-backdrop';
        backdrop.addEventListener('click', () => this.closeFloorOverlay());

        const dialog = document.createElement('div');
        dialog.className = 'control-panel-floor-dialog ui-modal-surface';

        const title = document.createElement('div');
        title.className = 'control-panel-floor-title';
        title.textContent = 'Выбор этажа';

        const list = document.createElement('div');
        list.className = 'control-panel-floor-list';

        dialog.appendChild(title);
        dialog.appendChild(list);
        overlay.appendChild(backdrop);
        overlay.appendChild(dialog);

        return overlay;
    }

    private updateLayout(container: HTMLDivElement): void {
        this.isLandscape = window.innerWidth > window.innerHeight;
        container.classList.toggle('landscape', this.isLandscape);
        container.classList.toggle('portrait', !this.isLandscape);
        container.classList.toggle('mobile-device', this.isMobileDevice);
    }

    private detectMobileDevice(): boolean {
        const userAgent = navigator.userAgent || '';
        const isMobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
        const isiPadOSDesktopUA = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        return isMobileUserAgent || isiPadOSDesktopUA;
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
        this.createGroupButton('building', 'icons/ui/apartmen.png', 'Здание');
        this.createGroupButton('camera', 'icons/ui/cam.png', 'Камера');
        this.createGroupButton('settings', 'icons/ui/settings.png', 'Настройки');

        this.createActionButton({
            id: 'qr-scan',
            defaultIcon: 'icons/ui/smart-cam.png',
            tooltip: 'Сканировать QR-код',
            type: UIEventType.QR_SCAN,
            togglesState: false
        });
        this.createActionButton({
            id: 'search',
            defaultIcon: 'icons/ui/search.png',
            tooltip: 'Поиск',
            type: UIEventType.SEARCH_TOGGLE,
            togglesState: false
        });
        this.createActionButton({
            id: 'auth',
            defaultIcon: 'icons/ui/lock.png',
            activeIcon: 'icons/ui/lock-open.png',
            tooltip: 'Авторизоваться',
            type: UIEventType.AUTH_TOGGLE,
            togglesState: false
        });
        this.createActionButton({
            id: 'mode',
            defaultIcon: 'icons/ui/mode-3d.png',
            activeIcon: 'icons/ui/mode-2d.png',
            tooltip: 'Переключить 2D/3D',
            type: UIEventType.CAMERA_MODE_TOGGLE
        });
        this.createActionButton({
            id: 'control-mode',
            defaultIcon: 'icons/ui/arrows-in.png',
            activeIcon: 'icons/ui/arrows-out.png',
            tooltip: 'Переключить Flight/Orbit',
            type: UIEventType.CAMERA_CONTROL_MODE_TOGGLE
        });
        this.createActionButton({
            id: 'reset',
            defaultIcon: 'icons/ui/reset.png',
            tooltip: 'Сброс камеры',
            type: UIEventType.RESET_CAMERA,
            togglesState: false
        });
        this.createActionButton({
            id: 'view',
            defaultIcon: 'icons/ui/expansion.png',
            activeIcon: 'icons/ui/expansion.png',
            tooltip: 'Этаж/Здание',
            type: UIEventType.TOGGLE_VIEW_MODE
        });
        this.createActionButton({
            id: 'expand',
            defaultIcon: 'icons/ui/layers-off.png',
            activeIcon: 'icons/ui/layers.png',
            tooltip: 'Раскрыть этажи',
            type: UIEventType.TOGGLE_FLOOR_EXPAND
        });
        this.createActionButton({
            id: 'walls',
            defaultIcon: 'icons/ui/eye-off.png',
            activeIcon: 'icons/ui/eye.png',
            tooltip: 'Прозрачность стен',
            type: UIEventType.TOGGLE_WALL_TRANSPARENCY
        });
        this.createActionButton({
            id: 'theme',
            defaultIcon: 'icons/ui/night.png',
            activeIcon: 'icons/ui/day.png',
            tooltip: 'Сменить тему',
            type: UIEventType.TOGGLE_THEME
        });
        this.createActionButton({
            id: 'markers',
            defaultIcon: 'icons/ui/location.png',
            activeIcon: 'icons/ui/location-off.png',
            tooltip: 'Скрыть все метки',
            type: UIEventType.TOGGLE_MARKERS
        });
        this.createActionButton({
            id: 'graph',
            defaultIcon: 'icons/ui/con-path-off.png',
            activeIcon: 'icons/ui/con-path.png',
            tooltip: 'Показать граф связей',
            type: UIEventType.TOGGLE_GRAPH
        });
        this.createActionButton({
            id: 'floor-current',
            defaultIcon: 'icons/ui/expansion.png',
            tooltip: 'Выбрать этаж',
            type: UIEventType.FLOOR_SELECT,
            togglesState: false
        });
        this.createActionButton({
            id: 'floor-up',
            defaultIcon: 'icons/ui/circle-arrow-up.png',
            tooltip: 'Следующий этаж',
            type: UIEventType.NEXT_FLOOR,
            togglesState: false
        });
        this.createActionButton({
            id: 'floor-down',
            defaultIcon: 'icons/ui/circle-arrow-down.png',
            tooltip: 'Предыдущий этаж',
            type: UIEventType.PREV_FLOOR,
            togglesState: false
        });

        const floorCurrentButton = this.buttons.get('floor-current');
        if (floorCurrentButton) {
            floorCurrentButton.classList.add('control-panel-floor-current');
        }
    }

    private createSlots(): void {
        this.createGroupSlot('building');
        this.createGroupSlot('camera');
        this.createGroupSlot('settings');
        this.createStaticSlot('qr-scan');
        this.createStaticSlot('search');
        this.createStaticSlot('auth');
    }

    private createGroupSlot(groupId: GroupId): void {
        const slot = document.createElement('div');
        slot.className = 'control-panel-slot control-panel-group-slot';
        slot.dataset.groupId = groupId;

        const panel = document.createElement('div');
        panel.className = 'control-panel-group-panel';

        this.groupSlots.set(groupId, slot);
        this.groupPanels.set(groupId, panel);

        slot.appendChild(panel);
        this.track.appendChild(slot);
    }

    private createStaticSlot(buttonId: string): void {
        const slot = document.createElement('div');
        slot.className = 'control-panel-slot control-panel-static-slot';
        slot.dataset.buttonId = buttonId;
        this.staticSlots.set(buttonId, slot);
        this.track.appendChild(slot);
    }

    private createGroupButton(groupId: GroupId, iconPath: string, tooltip: string): void {
        const button = document.createElement("button");
        button.className = 'control-panel-button control-panel-group-button';
        button.title = tooltip;
        button.dataset.groupId = groupId;

        const img = document.createElement("img");
        img.src = iconPath;
        img.alt = tooltip;
        img.width = this.config.BUTTON_ICON_SIZE;
        img.height = this.config.BUTTON_ICON_SIZE;

        button.appendChild(img);
        button.addEventListener('mouseenter', () => this.onButtonHoverStart(button));
        button.addEventListener('mouseleave', () => this.onButtonHoverEnd(button));
        button.addEventListener('click', () => this.onGroupButtonClick(groupId));

        this.groupButtons.set(groupId, button);
    }

    private createActionButton(config: ActionButtonConfig): void {
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
        button.addEventListener('click', () => this.onActionButtonClick(config));

        this.buttons.set(config.id, button);
        this.buttonStates.set(config.id, false);
        this.updateButtonAppearance(button, false);
        this.applyButtonInteractivity(button);
    }

    private onButtonHoverStart(button: HTMLButtonElement): void {
        if (button.disabled) return;
        button.style.transform = 'scale(1.05)';
        button.style.transition = `transform ${this.config.ANIMATION_DURATION}s ease`;
    }

    private onButtonHoverEnd(button: HTMLButtonElement): void {
        button.style.transform = 'scale(1)';
    }

    private onGroupButtonClick(groupId: GroupId): void {
        if (this.buttonsDisabled) {
            this.logger.debug('Group click ignored - buttons disabled');
            return;
        }

        this.closeFloorOverlay();

        if (this.activeGroup === groupId) {
            this.closeGroups();
            return;
        }

        this.activeGroup = groupId;
        this.floorSubgroupOpen = groupId === 'building' && this.getButtonState('view');
        this.renderPanels();
    }

    private onActionButtonClick(config: ActionButtonConfig): void {
        if (this.buttonsDisabled) {
            this.logger.debug('Button click ignored - buttons disabled');
            return;
        }

        if (config.id === 'floor-current') {
            if (this.currentFloor > 0) {
                this.toggleFloorOverlay();
            }
            return;
        }

        const togglesState = config.togglesState ?? true;
        if (togglesState) {
            const nextState = !this.getButtonState(config.id);
            this.updateButtonState(config.id, nextState);
        }

        if (config.id === 'view' && this.activeGroup === 'building') {
            this.floorSubgroupOpen = this.getButtonState('view');
            this.renderPanels();
        }

        this.closeFloorOverlay();
        this.emitEvent({ type: config.type });
    }

    private toggleFloorOverlay(): void {
        if (this.floorOverlayOpen) {
            this.closeFloorOverlay();
        } else {
            this.openFloorOverlay();
        }
    }

    private openFloorOverlay(): void {
        if (this.accessibleFloors.length === 0) return;

        this.floorOverlayOpen = true;
        this.renderFloorOverlay();
        this.floorOverlay.classList.add('open');
    }

    private closeFloorOverlay(): void {
        this.floorOverlayOpen = false;
        this.floorOverlay.classList.remove('open');
    }

    private renderFloorOverlay(): void {
        this.floorList.replaceChildren();

        this.accessibleFloors.forEach((floor) => {
            const button = document.createElement('button');
            button.className = 'control-panel-floor-option';
            button.textContent = `Этаж ${floor}`;
            button.classList.toggle('active', floor === this.currentFloor);
            button.addEventListener('click', () => {
                this.emitEvent({ type: UIEventType.FLOOR_SELECT, floor });
                this.closeFloorOverlay();
            });
            this.floorList.appendChild(button);
        });
    }

    private renderPanels(): void {
        this.renderGroupSlot('building');
        this.renderGroupSlot('camera');
        this.renderGroupSlot('settings');
        this.renderStaticSlot('qr-scan');
        this.renderStaticSlot('search');
        this.renderStaticSlot('auth');
    }

    private getBuildingNestedSlot(): HTMLDivElement {
        if (!this.buildingNestedSlot || !this.buildingNestedPanel) {
            this.buildingNestedSlot = document.createElement('div');
            this.buildingNestedSlot.className = 'control-panel-slot control-panel-nested-slot';

            this.buildingNestedPanel = document.createElement('div');
            this.buildingNestedPanel.className = 'control-panel-nested-panel';
            this.buildingNestedSlot.appendChild(this.buildingNestedPanel);
        }

        this.buildingNestedPanel.replaceChildren();
        this.appendButtons(this.buildingNestedPanel, ['floor-current', 'floor-up', 'floor-down']);
        if (!this.floorSubgroupOpen) {
            this.buildingNestedPanel.classList.remove('open');
        }

        const viewButton = this.buttons.get('view');
        if (viewButton && !this.buildingNestedSlot.contains(viewButton)) {
            this.buildingNestedSlot.appendChild(viewButton);
        }

        return this.buildingNestedSlot;
    }

    private renderGroupSlot(groupId: GroupId): void {
        const slot = this.groupSlots.get(groupId);
        const panel = this.groupPanels.get(groupId);
        const button = this.groupButtons.get(groupId);

        if (!slot || !panel || !button) return;

        panel.replaceChildren();
        button.classList.toggle('active', this.activeGroup === groupId);
        panel.classList.toggle('open', this.activeGroup === groupId);

        if (groupId === 'camera') {
            this.appendButtons(panel, ['mode', 'control-mode', 'reset']);
        } else if (groupId === 'settings') {
            this.appendButtons(panel, ['theme', 'markers', 'graph']);
        } else {
            panel.appendChild(this.getBuildingNestedSlot());
            this.appendButtons(panel, ['expand', 'walls']);
            this.syncBuildingNestedPanelAnimation();
        }

        if (!slot.contains(button)) {
            slot.appendChild(button);
        }
    }

    private renderStaticSlot(buttonId: string): void {
        const slot = this.staticSlots.get(buttonId);
        const button = this.buttons.get(buttonId);

        if (!slot || !button) return;

        if (!slot.contains(button)) {
            slot.appendChild(button);
        }
    }

    private appendButtons(panel: HTMLElement, buttonIds: string[]): void {
        buttonIds.forEach(buttonId => {
            const button = this.buttons.get(buttonId);
            if (button) {
                panel.appendChild(button);
            }
        });
    }

    private closeGroups(): void {
        this.activeGroup = null;
        this.floorSubgroupOpen = false;
        this.buildingNestedPanel?.classList.remove('open');
        this.closeFloorOverlay();
        this.renderPanels();
    }

    private syncBuildingNestedPanelAnimation(): void {
        if (!this.buildingNestedPanel) {
            return;
        }

        if (!this.floorSubgroupOpen) {
            this.buildingNestedPanel.classList.remove('open');
            return;
        }

        this.buildingNestedPanel.classList.remove('open');
        requestAnimationFrame(() => {
            this.buildingNestedPanel?.classList.add('open');
        });
    }

    private updateButtonAppearance(button: HTMLButtonElement, isActive: boolean): void {
        const img = button.querySelector('img');
        if (!img) return;

        const defaultIcon = button.dataset.defaultIcon;
        const activeIcon = button.dataset.activeIcon;

        img.src = isActive && activeIcon ? activeIcon : defaultIcon || img.src;
        button.classList.toggle('active', isActive);
    }

    private applyButtonInteractivity(button: HTMLButtonElement): void {
        const buttonId = button.dataset.buttonId;
        const disabled = this.buttonsDisabled || (!!buttonId && this.explicitlyDisabledButtons.has(buttonId));
        button.disabled = disabled;
        button.classList.toggle('disabled', disabled);
        button.style.pointerEvents = disabled ? 'none' : 'auto';
    }

    private updateAllButtonInteractivity(): void {
        this.getAllInteractiveButtons().forEach((button) => this.applyButtonInteractivity(button));
    }

    private emitEvent(event: ControlPanelEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    private getAllInteractiveButtons(): HTMLButtonElement[] {
        return [
            ...Array.from(this.groupButtons.values()),
            ...Array.from(this.buttons.values())
        ];
    }

    public updateButtonState(buttonId: string, isActive: boolean): void {
        const button = this.buttons.get(buttonId);
        if (!button) {
            this.logger.warn(`Button ${buttonId} not found`);
            return;
        }

        this.buttonStates.set(buttonId, isActive);
        this.updateButtonAppearance(button, isActive);

        if (buttonId === 'view') {
            if (!isActive) {
                this.floorSubgroupOpen = false;
                this.closeFloorOverlay();
            } else if (this.activeGroup === 'building') {
                this.floorSubgroupOpen = true;
            }
            this.renderPanels();
        }
    }

    public setButtonsEnabled(enabled: boolean): void {
        this.buttonsDisabled = !enabled;
        this.updateAllButtonInteractivity();
    }

    public setButtonDisabled(buttonId: string, disabled: boolean): void {
        if (disabled) {
            this.explicitlyDisabledButtons.add(buttonId);
        } else {
            this.explicitlyDisabledButtons.delete(buttonId);
        }

        const button = this.buttons.get(buttonId);
        if (button) {
            this.applyButtonInteractivity(button);
        }
    }

    public areButtonsDisabled(): boolean {
        return this.buttonsDisabled;
    }

    public getButtonState(buttonId: string): boolean {
        return this.buttonStates.get(buttonId) || false;
    }

    public setAuthState(userInfo: UserInfo): void {
        const authButton = this.buttons.get('auth');
        const currentRole = userInfo.role ?? 'guest';

        if (authButton) {
            authButton.title = userInfo.isAuthenticated ? 'Выйти' : 'Авторизоваться';
            this.updateButtonState('auth', userInfo.isAuthenticated);
        }

        this.accessBadge.textContent = `ROLE: ${currentRole}`;
        this.accessBadge.className = `control-panel-access ui-status-pill access-${currentRole}`;
    }

    public updateFloorButtons(currentFloor: number, maxFloor: number, accessibleFloors: number[] = []): void {
        const upButton = this.buttons.get('floor-up');
        const downButton = this.buttons.get('floor-down');
        const currentButton = this.buttons.get('floor-current');

        if (!upButton || !downButton || !currentButton) return;

        this.currentFloor = currentFloor;
        this.accessibleFloors = accessibleFloors;

        const isFloorMode = currentFloor > 0;
        const canGoUp = isFloorMode && currentFloor < maxFloor;
        const canGoDown = isFloorMode && currentFloor > 1;

        currentButton.title = isFloorMode ? `Этаж ${currentFloor}` : 'Сначала включите режим этажа';
        currentButton.textContent = isFloorMode ? `${currentFloor}` : '0';

        upButton.title = canGoUp ? 'Следующий этаж' : (isFloorMode ? 'Это последний этаж' : 'Сначала включите режим этажа');
        downButton.title = canGoDown ? 'Предыдущий этаж' : (isFloorMode ? 'Это первый этаж' : 'Сначала включите режим этажа');

        this.setButtonDisabled('floor-current', !isFloorMode);
        this.setButtonDisabled('floor-up', !canGoUp);
        this.setButtonDisabled('floor-down', !canGoDown);

        if (!isFloorMode) {
            this.floorSubgroupOpen = false;
            this.closeFloorOverlay();
        } else if (this.activeGroup === 'building' && this.getButtonState('view')) {
            this.floorSubgroupOpen = true;
        }

        if (this.floorOverlayOpen) {
            this.renderFloorOverlay();
        }

        this.renderPanels();
    }

    public setGraphVisible(visible: boolean): void {
        this.updateButtonState('graph', visible);
    }

    public setMarkersVisible(visible: boolean): void {
        this.updateButtonState('markers', !visible);
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
        this.groupButtons.clear();
        this.groupSlots.clear();
        this.staticSlots.clear();
        this.groupPanels.clear();
        if (this.floorOverlay.parentNode) {
            this.floorOverlay.parentNode.removeChild(this.floorOverlay);
        }
        if (this.accessBadge.parentNode) {
            this.accessBadge.parentNode.removeChild(this.accessBadge);
        }
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.logger.info("ControlPanel disposed");
    }
}
