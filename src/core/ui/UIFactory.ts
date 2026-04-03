import { injectable, inject } from "inversify";
import { TYPES } from "../di/Container";
import { Logger } from "../logger/Logger";
import { EventBus } from "../events/EventBus";
import { ControlPanel } from "../../features/ui/ControlPanel";
import { SearchBar } from "../../features/ui/SearchBar";
import { PopupManager } from "../../features/ui/PopupManager";
import { MarkerDetailsPanel } from "../../features/ui/MarkerDetailsPanel";
import { ConnectionScreen } from "../../features/ui/ConnectionScreen";
import { FPSCounter } from "../../features/ui/FPSCounter";
import { BuildingTitle } from "../../features/ui/BuildingTitle";
import { AuthPopup } from "../../features/ui/AuthPopup";
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