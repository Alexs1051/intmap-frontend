import { IAppConfig } from "@shared/types";

export const CONFIG_DEFAULTS: IAppConfig = {
    apiUrl: '/api',
    modelUrl: 'models/building_02.glb',
    basePath: '',
    debug: true,
    version: '1.0.0',
    environment: 'development',

    engine: {
        canvasId: 'gameCanvas',
        antialias: true,
        adaptToDeviceRatio: true
    },

    logging: {
        level: 'debug'
    },

    camera: {
        defaultPosition: { x: 0, y: 30, z: 40 },
        defaultTarget: { x: 0, y: 0, z: 0 },
        zoomSpeed: 0.5,
        rotationSpeed: 0.5
    },

    markers: {
        defaultIconSize: 32,
        maxDistance: 100
    },

    markerAnimator: {
        animationSpeed: 60,
        normalScale: 1.0,
        hoverScale: 1.2,
        selectedPeakScale: 1.8,
        selectedFinalScale: 1.5,
        spawnPeakScale: 1.2,
        selectedOutlineColor: { r: 0.3, g: 0.6, b: 1.0 }
    },

    markerWidget: {
        iconSize: 32,
        iconFontSize: 24,
        padding: 8,
        fontSize: 14,
        textureScale: 100,
        backgroundAlpha: 0.9,
        outlineScale: 1.2
    },

    buildingAnimator: {
        startHeight: 100,
        baseDuration: 800,
        floorDelay: 200,
        wallDelay: 50,
        wallStagger: 10,
        speedFactor: 1.5,
        frameRate: 60
    },

    graphRenderer: {
        lineColor: { r: 1, g: 0.5, b: 0 },
        lineThickness: 0.05,
        showArrows: true,
        arrowSize: 0.3,
        activeColor: { r: 1, g: 0.8, b: 0 },
        inactiveOpacity: 0.3,
        routeColor: { r: 0, g: 1, b: 0 },
        routeAnimationSpeed: 2
    },

    controlPanel: {
        buttonSize: 50,
        buttonIconSize: 30,
        animationDuration: 0.3
    },

    searchBar: {
        maxResults: 10,
        minQueryLength: 2,
        debounceDelay: 300,
        placeholder: 'Поиск...'
    },

    popupManager: {
        maxPopups: 5,
        defaultDuration: 3000,
        animationDuration: 300
    },

    loadingScreen: {
        title: 'Загрузка...',
        animationDuration: 500
    },

    connectionScreen: {
        retryButtonText: 'Повторить',
        defaultMessage: 'Соединение потеряно',
        errorMessage: 'Ошибка соединения'
    },

    buildingTitle: {
        defaultTitle: 'Здание'
    },

    authPopup: {
        title: 'Авторизация',
        loginLabel: 'Логин',
        passwordLabel: 'Пароль',
        loginPlaceholder: 'Введите логин',
        passwordPlaceholder: 'Введите пароль',
        cancelButtonText: 'Отмена',
        submitButtonText: 'Войти',
        logoutConfirmText: 'Вы уверены, что хотите выйти?',
        logoutButtonText: 'Выйти',
        testUser: 'test',
        testPass: 'test',
        testRole: 'user'
    }
};