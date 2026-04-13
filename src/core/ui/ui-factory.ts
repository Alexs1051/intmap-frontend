import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { EventBus } from "@core/events/event-bus";
import { ControlPanel } from "@features/ui/control-panel/control-panel";
import { SearchBar } from "@features/ui/search/search-bar";
import { PopupManager } from "@features/ui/popup/popup-manager";
import { MarkerDetailsPanel } from "@features/ui/details/marker-details-panel";
import { ConnectionScreen } from "@features/ui/connection/connection-screen";
import { FPSCounter } from "@features/ui/hud/fps-counter";
import { BuildingTitle } from "@features/ui/hud/building-title";
import { AuthPopup } from "@features/ui/popup/auth-popup";
import {
    IAuthPopup,
    IBuildingTitle,
    IConnectionScreen,
    IControlPanel,
    IFPSCounter,
    IMarkerDetailsPanel,
    IPopupManager,
    ISearchBar
} from "@shared/interfaces";

@injectable()
export class UIFactory {
    private logger: Logger;
    private eventBus: EventBus;

    constructor(
        @inject(TYPES.Logger) logger: Logger,
        @inject(TYPES.EventBus) eventBus: EventBus
    ) {
        this.logger = logger.getLogger('UIFactory');
        this.eventBus = eventBus;
    }

    public createControlPanel(): IControlPanel {
        return new ControlPanel(this.logger);
    }

    public createSearchBar(): ISearchBar {
        return new SearchBar(this.logger, this.eventBus);
    }

    public createPopupManager(): IPopupManager {
        return new PopupManager(this.logger, this.eventBus);
    }

    public createMarkerDetailsPanel(): IMarkerDetailsPanel {
        return new MarkerDetailsPanel();
    }

    public createConnectionScreen(): IConnectionScreen {
        return new ConnectionScreen(this.logger);
    }

    public createFPSCounter(): IFPSCounter {
        return new FPSCounter(this.logger);
    }

    public createBuildingTitle(): IBuildingTitle {
        return new BuildingTitle(this.logger);
    }

    public createAuthPopup(): IAuthPopup {
        return new AuthPopup(this.logger);
    }
}