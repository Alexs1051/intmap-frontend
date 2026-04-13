import { Scene, Animation, SineEase, EasingFunction, TransformNode, Vector3 } from "@babylonjs/core";
import { injectable, inject } from "inversify";
import { TYPES } from "@core/di/container";
import { Logger } from "@core/logger/logger";
import { FLOOR_EXPAND_CONFIG } from "@shared/constants";
import { BuildingElement } from "@shared/types";
import { Marker } from "@features/markers/marker";

/**
 * Менеджер раскрытия этажей
 * Отвечает за плавное смещение этажей по вертикали
 */
@injectable()
export class FloorExpander {
    private readonly logger: Logger;
    private scene?: Scene;

    private isExpanded: boolean = false;
    private isAnimating: boolean = false;

    public getIsAnimating(): boolean {
        return this.isAnimating;
    }

    private originalFloorPositions: Map<number, number> = new Map();
    private markerOriginalPositions: Map<string, Vector3> = new Map();
    private markers: Marker[] = [];
    private markerManager: any = null;

    // Состояние графа и маршрута перед анимацией
    private savedGraphState: {
        graphWasVisible: boolean;
        fromMarkerId: string | null;
        toMarkerId: string | null;
        highlightedPath: string[] | null;
    } = {
            graphWasVisible: false,
            fromMarkerId: null,
            toMarkerId: null,
            highlightedPath: null
        };

    constructor(
        @inject(TYPES.Logger) logger: Logger
    ) {
        this.logger = logger.getLogger('FloorExpander');
    }

    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    /**
     * Установить MarkerManager для динамического получения маркеров
     */
    public setMarkerManager(markerManager: any): void {
        this.markerManager = markerManager;
        this.logger.debug('MarkerManager set for dynamic marker access');
        console.log('[FloorExpander] MarkerManager set');
    }

    /**
     * Установить ссылки на маркеры из MarkerManager (legacy)
     */
    public setMarkers(markers: Marker[]): void {
        this.markers = markers;
        this.logger.debug(`Set ${markers.length} markers for floor expansion`);

        // Логируем первые 5 маркеров для отладки
        markers.slice(0, 5).forEach((marker, idx) => {
            const root = marker.root;
            this.logger.debug(`Marker[${idx}] id=${marker.id}, floor=${marker.floor}, root=${root ? root.name : 'null'}, position=${root ? root.position.toString() : 'null'}`);
        });
    }

    /**
     * Получить актуальный список маркеров
     */
    private getCurrentMarkers(): Marker[] {
        if (this.markerManager) {
            const markers = this.markerManager.getAllMarkers();
            this.logger.debug(`Getting ${markers.length} markers from MarkerManager dynamically`);
            console.log('[FloorExpander] Getting markers from MarkerManager:', markers.length);
            return markers;
        }
        this.logger.debug(`Using static markers list: ${this.markers.length}`);
        console.log('[FloorExpander] Using static markers list:', this.markers.length);
        return this.markers;
    }

    /**
     * Сохранить позиции маркеров, если они ещё не сохранены
     */
    private storeMarkerPositionsIfNeeded(): void {
        const currentMarkers = this.getCurrentMarkers();
        let storedCount = 0;

        currentMarkers.forEach(marker => {
            // Если позиция уже сохранена, пропускаем
            if (this.markerOriginalPositions.has(marker.id)) return;

            const root = marker.root;
            if (root) {
                this.markerOriginalPositions.set(marker.id, root.position.clone());
                storedCount++;
                console.log(`[FloorExpander] Stored marker position: ${marker.id}, floor=${marker.floor}, Y=${root.position.y}`);
            }
        });

        if (storedCount > 0) {
            this.logger.debug(`Stored ${storedCount} marker positions`);
            console.log('[FloorExpander] Stored marker positions:', storedCount);
        }
    }

    /**
     * Сохранить состояние графа и маршрута, затем скрыть их
     */
    public saveAndHideGraphState(): void {
        if (!this.markerManager) return;

        this.savedGraphState.graphWasVisible = this.markerManager.graphVisible;
        this.savedGraphState.fromMarkerId = this.markerManager.getFromMarker();
        this.savedGraphState.toMarkerId = this.markerManager.getToMarker();

        // Получаем текущий выделенный путь через проверку внутренних маркеров
        try {
            const selectedMarkers = this.markerManager.getSelectedMarkersForPath?.();
            this.savedGraphState.highlightedPath = selectedMarkers && selectedMarkers.length > 0
                ? selectedMarkers
                : null;
        } catch {
            this.savedGraphState.highlightedPath = null;
        }

        console.log('[FloorExpander] Saved graph state:', this.savedGraphState);

        // Скрываем граф и очищаем маршрут
        if (this.savedGraphState.graphWasVisible) {
            this.markerManager.setGraphVisible(false);
        }
        this.markerManager.clearRouteSelection();
        this.markerManager.clearPathHighlight();

        this.logger.debug('Graph state saved and hidden');
    }

    /**
     * Восстановить состояние графа и маршрута после анимации
     */
    public restoreGraphState(): void {
        if (!this.markerManager) return;

        console.log('[FloorExpander] Restoring graph state:', this.savedGraphState);

        // Восстанавливаем граф если он был видим
        if (this.savedGraphState.graphWasVisible) {
            this.logger.debug('Restoring graph with new positions');
            // Ждём завершения анимации маркеров (800ms + 200ms запас)
            setTimeout(() => {
                // Полностью перестраиваем граф с новыми позициями
                this.markerManager.rebuildGraph();
                this.logger.debug('Graph rebuilt with current positions');
                console.log('[FloorExpander] Graph rebuilt after animation delay');
            }, 1000);
            this.logger.debug('Graph restore scheduled (1000ms delay)');
        }

        // Восстанавливаем маршрут если он был
        if (this.savedGraphState.fromMarkerId && this.savedGraphState.toMarkerId) {
            // Ждём завершения анимации маркеров (800ms + 300ms запас)
            setTimeout(() => {
                this.markerManager.setFromMarker(this.savedGraphState.fromMarkerId);
                this.markerManager.setToMarker(this.savedGraphState.toMarkerId);

                // Пересчитываем и подсвечиваем маршрут заново
                try {
                    const pathResult = this.markerManager.findPath(this.savedGraphState.fromMarkerId, this.savedGraphState.toMarkerId);
                    if (pathResult && pathResult.path) {
                        const pathIds = pathResult.path.map((p: any) => p.markerId || p);
                        this.markerManager.highlightPath(pathIds);
                        this.logger.debug(`Route recalculated and highlighted: ${pathIds.length} nodes`);
                    }
                } catch (error) {
                    this.logger.warn('Failed to recalculate route after expand', error);
                }

                this.logger.debug(`Route restored: ${this.savedGraphState.fromMarkerId} -> ${this.savedGraphState.toMarkerId}`);
            }, 1100);
            this.logger.debug('Route restore scheduled (1100ms delay)');
        }

        this.logger.debug('Graph state restored');
    }

    /**
     * Запомнить оригинальные позиции этажей
     */
    public storeOriginalPositions(
        floorNodes: Map<number, TransformNode>,
        elements: Map<string, BuildingElement>
    ): void {
        floorNodes.forEach((node, floorNum) => {
            this.originalFloorPositions.set(floorNum, node.position.y);
        });

        // Запоминаем оригинальные позиции всех мешей (маркеров и других элементов)
        elements.forEach((element, name) => {
            // Маркеры обычно имеют 'Marker_' в имени
            if (name.includes('Marker_') || element.metadata?.markerId) {
                this.markerOriginalPositions.set(name, element.mesh.position.clone());
            }
        });

        // Запоминаем оригинальные позиции маркеров из MarkerManager
        // Сохраняем позицию root TransformNode, а не mesh
        let markersStored = 0;
        const currentMarkers = this.getCurrentMarkers();
        currentMarkers.forEach(marker => {
            const root = marker.root;
            if (root) {
                this.markerOriginalPositions.set(marker.id, root.position.clone());
                markersStored++;
            } else {
                this.logger.warn(`Marker ${marker.id} has no root!`);
            }
        });

        this.logger.debug(`Stored original positions for ${floorNodes.size} floors and ${markersStored}/${currentMarkers.length} markers, total stored: ${this.markerOriginalPositions.size}`);
        console.log('[FloorExpander] Stored positions:', {
            floors: floorNodes.size,
            markersStored,
            totalMarkers: currentMarkers.length,
            totalInMap: this.markerOriginalPositions.size
        });
    }

    /**
     * Раскрыть этажи (раздвинуть по вертикали)
     */
    public async expand(
        floorNodes: Map<number, TransformNode>,
        _floorElements: Map<number, BuildingElement[]>,
        allElements?: Map<string, BuildingElement>
    ): Promise<void> {
        if (this.isExpanded || this.isAnimating) {
            this.logger.debug(`Expand skipped: isExpanded=${this.isExpanded}, isAnimating=${this.isAnimating}`);
            return;
        }

        this.logger.info('Expanding floors');
        this.logger.debug(`Floor nodes: ${floorNodes.size}, markers: ${this.getCurrentMarkers().length}, allElements: ${allElements?.size || 0}`);
        console.log('[FloorExpander] Starting expand:', {
            floorNodes: floorNodes.size,
            markers: this.getCurrentMarkers().length,
            floorNumbers: Array.from(floorNodes.keys())
        });
        this.isAnimating = true;

        // Сохраняем позиции маркеров ПЕРЕД анимацией (они могут быть созданы позже)
        this.storeMarkerPositionsIfNeeded();

        // Сохраняем состояние графа и скрываем его
        this.saveAndHideGraphState();

        const floorNumbers = Array.from(floorNodes.keys()).sort((a, b) => a - b);
        this.logger.debug(`Floor numbers to animate: ${floorNumbers.join(', ')}`);

        const animations: Promise<void>[] = [];

        floorNumbers.forEach((floorNum, index) => {
            const floorNode = floorNodes.get(floorNum);
            if (!floorNode) return;

            const originalY = this.originalFloorPositions.get(floorNum);
            if (originalY === undefined) return;

            const targetY = originalY + (index * FLOOR_EXPAND_CONFIG.FLOOR_OFFSET);
            animations.push(this.animateNodePosition(floorNode, targetY));
        });

        // Анимируем все элементы (включая маркеры)
        if (allElements) {
            allElements.forEach((element) => {
                const floorNum = element.floorNumber;
                if (floorNum === undefined) return;

                const floorIndex = floorNumbers.indexOf(floorNum);
                if (floorIndex === -1) return;

                const originalY = this.markerOriginalPositions.get(element.name);
                if (!originalY && !element.mesh.metadata?.originalPosition) return;

                const baseY = originalY || element.mesh.metadata?.originalPosition?.y || element.mesh.position.y;
                const targetY = baseY + (floorIndex * FLOOR_EXPAND_CONFIG.FLOOR_OFFSET);

                // Не анимируем, если элемент привязан к TransformNode этажа
                if (element.mesh.parent && element.mesh.parent.name?.startsWith('Floor_')) {
                    return;
                }

                animations.push(this.animateMeshPosition(element.mesh, targetY));
            });
        }

        // Анимируем маркеры из MarkerManager
        let markersAnimated = 0;
        let markersSkipped = 0;
        const currentMarkers = this.getCurrentMarkers();
        currentMarkers.forEach(marker => {
            const floorNum = marker.floor;
            if (floorNum === undefined) {
                this.logger.debug(`Marker ${marker.id}: floor is undefined, skipping`);
                markersSkipped++;
                return;
            }

            const floorIndex = floorNumbers.indexOf(floorNum);
            if (floorIndex === -1) {
                this.logger.debug(`Marker ${marker.id}: floor ${floorNum} not found in floorNumbers, skipping`);
                markersSkipped++;
                return;
            }

            // Двигаем root TransformNode маркера, а не mesh
            const root = marker.root;
            if (!root) {
                this.logger.debug(`Marker ${marker.id}: no root, skipping`);
                markersSkipped++;
                return;
            }

            const originalPos = this.markerOriginalPositions.get(marker.id);
            if (!originalPos) {
                this.logger.debug(`Marker ${marker.id}: no original position stored, skipping`);
                markersSkipped++;
                return;
            }

            const targetY = originalPos.y + (floorIndex * FLOOR_EXPAND_CONFIG.FLOOR_OFFSET);
            this.logger.debug(`Marker ${marker.id}: floor=${floorNum}, floorIndex=${floorIndex}, originalY=${originalPos.y}, targetY=${targetY}`);
            console.log(`[FloorExpander] Animating marker ${marker.id}: floor=${floorNum}, from Y=${originalPos.y} to Y=${targetY}`);
            animations.push(this.animateTransformNodePosition(root, targetY));
            markersAnimated++;
        });

        this.logger.debug(`Markers: ${markersAnimated} animated, ${markersSkipped} skipped`);
        console.log('[FloorExpander] Markers animated:', {
            animated: markersAnimated,
            skipped: markersSkipped,
            total: currentMarkers.length
        });

        await Promise.all(animations);

        // Дополнительная задержка, чтобы анимации Babylon.js точно завершились
        await new Promise(resolve => setTimeout(resolve, 50));

        this.isExpanded = true;
        this.isAnimating = false;

        // Восстанавливаем состояние графа
        this.restoreGraphState();

        this.logger.info('Floor expansion complete');
        console.log('[FloorExpander] Expand complete');
    }

    /**
     * Свернуть этажи (вернуть в исходное положение)
     */
    public async collapse(
        floorNodes: Map<number, TransformNode>,
        _floorElements: Map<number, BuildingElement[]>,
        allElements?: Map<string, BuildingElement>
    ): Promise<void> {
        if (!this.isExpanded || this.isAnimating) {
            this.logger.debug(`Collapse skipped: isExpanded=${this.isExpanded}, isAnimating=${this.isAnimating}`);
            return;
        }

        this.logger.info('Collapsing floors');
        this.isAnimating = true;

        // Убеждаемся, что позиции маркеров сохранены
        this.storeMarkerPositionsIfNeeded();

        // Сохраняем состояние графа и скрываем его
        this.saveAndHideGraphState();

        const floorNumbers = Array.from(floorNodes.keys()).sort((a, b) => a - b);
        const animations: Promise<void>[] = [];

        floorNumbers.forEach((floorNum) => {
            const floorNode = floorNodes.get(floorNum);
            if (!floorNode) return;

            const originalY = this.originalFloorPositions.get(floorNum);
            if (originalY === undefined) return;

            animations.push(this.animateNodePosition(floorNode, originalY));
        });

        // Возвращаем все элементы в оригинальные позиции
        if (allElements) {
            allElements.forEach((element) => {
                // Не анимируем, если элемент привязан к TransformNode этажа
                if (element.mesh.parent && element.mesh.parent.name?.startsWith('Floor_')) {
                    return;
                }

                const originalPos = this.markerOriginalPositions.get(element.name);
                if (originalPos) {
                    animations.push(this.animateMeshPosition(element.mesh, originalPos.y));
                } else if (element.mesh.metadata?.originalPosition) {
                    animations.push(this.animateMeshPosition(element.mesh, element.mesh.metadata.originalPosition.y));
                }
            });
        }

        // Возвращаем маркеры из MarkerManager в оригинальные позиции
        let markersAnimated = 0;
        const currentMarkers = this.getCurrentMarkers();
        currentMarkers.forEach(marker => {
            const root = marker.root;
            if (!root) return;

            const originalPos = this.markerOriginalPositions.get(marker.id);
            if (originalPos) {
                this.logger.debug(`Marker ${marker.id}: returning to originalY=${originalPos.y}`);
                animations.push(this.animateTransformNodePosition(root, originalPos.y));
                markersAnimated++;
            } else {
                this.logger.debug(`Marker ${marker.id}: no original position stored`);
            }
        });

        this.logger.debug(`Collapse: ${markersAnimated} markers animated`);

        await Promise.all(animations);

        // Дополнительная задержка, чтобы анимации Babylon.js точно завершились
        await new Promise(resolve => setTimeout(resolve, 50));

        this.isExpanded = false;
        this.isAnimating = false;

        // Восстанавливаем состояние графа
        this.restoreGraphState();

        this.logger.info('Floor collapse complete');
    }

    /**
     * Анимировать позицию TransformNode
     */
    private animateNodePosition(node: TransformNode, targetY: number): Promise<void> {
        return new Promise((resolve) => {
            if (!this.scene) {
                this.logger.warn('Scene not set, skipping animation');
                resolve();
                return;
            }

            this.logger.debug(`Animating ${node.name}: from Y=${node.position.y} to Y=${targetY}`);

            const anim = new Animation(
                `floor_expand_${node.name}`,
                "position.y",
                FLOOR_EXPAND_CONFIG.FRAME_RATE,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            const frames = Math.round(FLOOR_EXPAND_CONFIG.ANIMATION_DURATION / (1000 / FLOOR_EXPAND_CONFIG.FRAME_RATE));
            anim.setKeys([
                { frame: 0, value: node.position.y },
                { frame: frames, value: targetY }
            ]);

            const easing = new SineEase();
            easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
            anim.setEasingFunction(easing);

            node.animations = [anim];

            this.scene.beginAnimation(node, 0, frames, false, 1.0, () => {
                node.position.y = targetY;
                resolve();
            });
        });
    }

    /**
     * Анимировать позицию TransformNode (для маркеров)
     */
    private animateTransformNodePosition(node: TransformNode, targetY: number): Promise<void> {
        this.logger.debug(`animateTransformNodePosition called for ${node.name}, targetY=${targetY}`);
        return this.animateNodePosition(node, targetY);
    }

    /**
     * Анимировать позицию Mesh
     */
    private animateMeshPosition(mesh: any, targetY: number): Promise<void> {
        return new Promise((resolve) => {
            if (!this.scene) {
                resolve();
                return;
            }

            const anim = new Animation(
                `floor_expand_mesh_${mesh.name}`,
                "position.y",
                FLOOR_EXPAND_CONFIG.FRAME_RATE,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            const frames = Math.round(FLOOR_EXPAND_CONFIG.ANIMATION_DURATION / (1000 / FLOOR_EXPAND_CONFIG.FRAME_RATE));
            anim.setKeys([
                { frame: 0, value: mesh.position.y },
                { frame: frames, value: targetY }
            ]);

            const easing = new SineEase();
            easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
            anim.setEasingFunction(easing);

            mesh.animations = [anim];

            this.scene.beginAnimation(mesh, 0, frames, false, 1.0, () => {
                mesh.position.y = targetY;
                resolve();
            });
        });
    }

    /**
     * Проверить, раскрыты ли этажи
     */
    public getExpanded(): boolean {
        return this.isExpanded;
    }

    /**
     * Проверить, выполняется ли анимация
     */
    getAnimating(): boolean {
        return this.isAnimating;
    }
}
