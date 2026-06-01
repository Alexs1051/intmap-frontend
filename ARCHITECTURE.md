# IntMap Frontend Architecture

Этот документ описывает актуальную архитектуру `intmap-frontend` после рефакторинга, а не только планируемое направление развития.

Документ нужен как опорная архитектурная карта для:

- понимания устройства frontend;
- подготовки пояснительной записки;
- сопровождения проекта;
- дальнейшей точечной полировки без хаотичного переписывания.

## Архитектурная идея

Frontend организован как **domain-oriented клиентское приложение** с несколькими крупными зонами ответственности и тонким bootstrap-слоем.

Ключевой принцип:

- визуальная часть, сцена, интеграция с backend и UI должны быть разделены логически;
- крупные классы должны оставаться orchestration-узлами, а не монолитами, в которых смешано всё подряд.

Текущий стиль можно описать так:

- `bootstrap` — запуск приложения;
- `scene` — жизненный цикл Babylon-сцены;
- `building` — загрузка и структура здания;
- `navigation` — маркеры, граф и маршруты;
- `ui-shell` — orchestration пользовательского интерфейса;
- `integration` — API, auth session и backend-driven flow.

## Верхнеуровневая структура проекта

Основные каталоги:

- `src/app.ts`
- `src/core`
- `src/features`
- `src/shared`
- `src/styles`
- `public`

### `app.ts`

Роль:

- точка входа frontend;
- создание контейнера зависимостей;
- инициализация сцены;
- запуск первичной загрузки;
- контроль критических ошибок на старте.

`app.ts` должен оставаться bootstrap-слоем и не должен постепенно превращаться в ещё один большой orchestration-класс.

## Зона `core`

`core` — это инфраструктурный слой frontend.

Подкаталоги:

- `core/api`
- `core/assets`
- `core/config`
- `core/di`
- `core/engine`
- `core/events`
- `core/logger`
- `core/route`
- `core/scene`
- `core/ui`
- `core/utils`

### `core/api`

Ответственность:

- работа с backend API;
- хранение базовой логики `apiFetch`;
- подстановка JWT;
- нормализация URL для reverse proxy / HTTPS;
- преобразование backend DTO в frontend-friendly структуры.

Ключевые файлы:

- `api-client.ts`
- `auth-api.ts`
- `building-api.ts`
- `marker-api.ts`
- `route-api.ts`

Особенно важно:

- `api-client.ts` — единая точка авторизованных запросов;
- `building-api.ts` — собирает frontend-ready каталог зданий из нескольких backend endpoint'ов;
- `marker-api.ts` — строит клиентское представление маркерного графа;
- `route-api.ts` — отвечает только за запрос маршрута, а не за визуализацию пути.

### `core/scene`

Ответственность:

- создание и владение Babylon `Scene`;
- orchestration загрузки и инициализации подсистем;
- связывание `building`, `camera`, `markers`, `ui`;
- жизненный цикл сцены и её компонентов.

После рефакторинга зона состоит из:

- `scene-manager.ts`
- `scene-manager-registry.ts`
- `scene-manager-loading-flow.ts`

Разделение сделано так:

- `SceneManager` остался центральным координатором;
- registry отвечает за регистрацию и связь компонентов;
- loading flow управляет последовательностью загрузки модели и связанных систем.

### `core/ui`

Это orchestration-слой пользовательского интерфейса.

Ключевые файлы:

- `ui-manager.ts`
- `ui-manager-building-flow.ts`
- `ui-manager-control-flow.ts`
- `ui-manager-session-flow.ts`
- `ui-manager-deep-link-flow.ts`
- `ui-manager-qr-scanner.ts`
- `ui-factory.ts`
- `loading-handler.ts`

До рефакторинга `UIManager` был основным “божественным” классом frontend.  
Теперь большая часть его обязанностей вынесена в отдельные flow-классы:

- переключение зданий;
- логин/логаут и session refresh;
- QR-сканирование;
- deep-link;
- orchestration control panel и floor switching.

Сам `UIManager` теперь ближе к роли координатора верхнего UI.

### `core/route`

Отвечает за маршрут как состояние и сценарий пользовательского взаимодействия.

Задачи:

- orchestration route selection;
- взаимодействие между маркерами и UI;
- управление пользовательским route flow.

Это логически уже отдельная предметная зона, хотя физически она всё ещё лежит в `core`.

## Зона `features`

`features` — это предметные подсистемы приложения.

Каталоги:

- `background`
- `building`
- `camera`
- `grid`
- `lighting`
- `markers`
- `ui`

### `features/building`

Задачи:

- загрузка 3D-модели;
- построение клиентского представления здания;
- этажи, комнаты, стены;
- animation flow построения;
- floor expand/collapse;
- синхронизация с graph state и route state.

Ключевые файлы:

- `building-manager.ts`
- `building-loader.ts`
- `building-parser.ts`
- `building-animator.ts`
- `floor-manager.ts`
- `floor-expander.ts`
- `floor-expander-graph-state.ts`
- `wall-manager.ts`
- `marker-utils.ts`

Эта зона уже не только про визуализацию mesh'ей, но и про поведение здания как навигационной структуры.

Что было улучшено:

- `MarkerUtils` вынесен отдельно и больше не живёт внутри `connection-parser`;
- `floor-expander` разгружен через отдельный `floor-expander-graph-state.ts`;
- часть связей с marker-сценариями стала чище.

### `features/camera`

Задачи:

- управление режимами камеры;
- фокусировка;
- переходы между режимами;
- анимации камеры;
- синхронизация UI-состояния с camera state.

Ключевые файлы:

- `camera-manager.ts`
- `camera-animator.ts`
- `camera-input-handler.ts`
- `camera-mode-manager.ts`

Эта зона уже достаточно хорошо выделена доменно.

### `features/markers`

Это одна из ключевых предметных зон frontend.

Задачи:

- backend loading маркеров и связей;
- создание marker entities;
- видимость маркеров по этажу, роли и состоянию graph;
- route selection;
- pathfinding и path highlight;
- hover/click/double click interaction;
- gateway-aware behavior;
- billboard и marker widgets.

Ключевые файлы после рефакторинга:

- `marker-manager.ts`
- `marker-loading-service.ts`
- `marker-visibility-service.ts`
- `marker-selection-service.ts`
- `marker-interaction-service.ts`
- `marker-path-service.ts`
- `marker.ts`
- `marker-animator.ts`
- `pathfinder.ts`
- `components/marker-widget.ts`
- `graph/marker-graph.ts`
- `graph/marker-graph-renderer.ts`

Что важно архитектурно:

- `MarkerManager` теперь не тащит на себе всю логику целиком;
- сервисы вокруг него разделены по responsibility;
- сам manager выполняет orchestration и объединяет доменные подсценарии.

### `features/ui`

Это набор виджетов и визуальных сценариев.

Подзоны:

- `control-panel`
- `connection`
- `details`
- `hud`
- `popup`
- `search`

Ключевые файлы:

- `control-panel.ts`
- `marker-details-panel.ts`
- `building-title.ts`
- `auth-popup.ts`
- `popup-manager.ts`
- `search-bar.ts`
- `search-bar-index-service.ts`
- `search-bar-query-service.ts`

После рефакторинга `SearchBar` больше не содержит в себе и UI, и индекс, и фильтрацию одновременно:

- индекс вынесен в `search-bar-index-service.ts`
- фильтрация вынесена в `search-bar-query-service.ts`

## Зона `shared`

`shared` хранит:

- типы;
- интерфейсы;
- константы;
- ошибки;
- общие утилиты.

Это общий слой, но уже не беспорядочная “свалка”.

Тем не менее, он остаётся зоной, за которой надо следить, чтобы туда не стекалась вся доменная логика подряд.

## Зона `styles`

`styles` выполняет роль маленькой design system.

Что там сосредоточено:

- базовые переменные;
- theme tokens;
- component styles;
- layout styles;
- visual consistency между desktop/mobile/light/dark.

После последних правок:

- loading screen согласован с темами;
- красный акцент закреплён за тёмной темой;
- синий акцент закреплён за светлой темой;
- мобильные overlay и QR-модалки улучшены.

## Актуальная доменная карта frontend

Если смотреть не на файловую структуру, а на реальные смысловые зоны, frontend состоит из:

### 1. `bootstrap`

- `app.ts`

### 2. `scene`

- `core/scene`
- `core/engine`
- часть `core/events`

### 3. `building`

- `features/building`

### 4. `navigation`

- `features/markers`
- `core/route`

### 5. `ui-shell`

- `core/ui`
- `features/ui`

### 6. `integration`

- `core/api`
- auth/session storage
- backend-driven asset loading
- QR/deep-link external entry points

## Последовательность работы приложения

Ниже приведён упрощённый жизненный цикл frontend.

### 1. Старт приложения

`app.ts`:

- собирает DI-контейнер;
- получает основные менеджеры;
- загружает каталог зданий;
- определяет стартовое здание;
- запускает полную загрузку сцены.

### 2. Инициализация сцены

`SceneManager`:

- создаёт Babylon scene;
- связывает camera/building/marker/ui менеджеры;
- запускает loading flow.

### 3. Загрузка модели

`BuildingApi` + `BuildingManager` + `BuildingLoader`:

- получают `model-info` и список asset'ов;
- выбирают `FULL` или набор `FLOOR` asset'ов;
- скачивают их через backend;
- передают в Babylon loader.

### 4. Загрузка графа навигации

`MarkerApi` + `MarkerLoadingService`:

- загружают маркеры;
- загружают связи;
- преобразуют payload в клиентский graph;
- передают данные в `MarkerManager`.

### 5. Пользовательская работа

Дальше система поддерживает:

- выбор здания;
- выбор этажа;
- поиск;
- открытие деталей маркера;
- построение маршрута;
- фокус камеры;
- deep-link/QR;
- логин/логаут.

## Что было сделано именно в архитектуре

### Разгрузка `UIManager`

Было:

- один крупный класс с UI, auth, building reload, QR, deep-link и route cleanup.

Стало:

- orchestration-класс + набор flow-компонентов.

### Разгрузка `MarkerManager`

Было:

- один класс с loading, selection, graph, pathfinding, visibility и interaction.

Стало:

- coordinator + набор marker-сервисов по responsibility.

### Разгрузка `SceneManager`

Было:

- один класс, в котором смешивались registry, initialize и loading flow.

Стало:

- manager + registry + loading flow.

### Изоляция API и HTTPS-проблем

Было:

- сильная зависимость от абсолютных backend URLs и reverse proxy нюансов.

Стало:

- нормализация URL на клиенте;
- JWT-aware fetch;
- backend asset loading через frontend-controlled flow.

## Ключевые принципы дальнейшей разработки

- не возвращать логику обратно в монолитные менеджеры;
- новые UI-сценарии сначала относить к `flow` или `service`, а не сразу в `UIManager`;
- новые marker-правила сначала относить к отдельным marker-сервисам;
- любые backend URL и fetch-сценарии держать в `core/api`, а не размазывать по features;
- поддерживать distinction между orchestration-классами и low-level доменной логикой.

## Что ещё можно улучшать

Следующие зоны для будущей полировки:

- `ControlPanel` и часть floor animation logic;
- более тонкая типизация некоторых shared interfaces;
- остаточные parser/helper упрощения в `building`;
- локальная чистка CSS и компонентных зависимостей;
- дополнительная документация последовательностей работы UI.

Но уже сейчас архитектура frontend достаточно оформлена и пригодна для описания в дипломном отчёте.
