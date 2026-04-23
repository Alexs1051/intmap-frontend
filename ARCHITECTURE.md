# IntMap Frontend Architecture

Этот документ фиксирует текущую архитектурную карту `intmap-frontend`, основные зоны ответственности и порядок безопасного рефакторинга.

Цель фронтового рефакторинга:

- сделать структуру фронта читаемой;
- убрать legacy-ветки и мёртвый код;
- уменьшить связанность между крупными менеджерами;
- подготовить кодовую базу к более явному domain-oriented разложению без полного переписывания UI и Babylon-сцены.

Проект не требует перехода на отдельные SPA-модули, микрофронтенды или сложную feature platform. Целевой стиль для него: **domain-oriented frontend с тонким core orchestration**.

## Что уже изменилось

На текущем этапе frontend:

- больше не работает как автономный viewer для локальных `.glb` из репозитория;
- получает каталог зданий, маркеры, связи и маршруты с backend;
- загружает защищённые asset’ы через авторизованный backend flow;
- учитывает роли и ограничения доступа при отображении помещений, этажей, gateway и маршрутов.

Уже выполнены заметные структурные изменения:

- `UIManager` разделён на `building`, `control`, `session`, `deep-link` и `QR` flow;
- `MarkerManager` разделён на loading/visibility/selection/interaction/path сервисы;
- `SceneManager` разделён на registry и loading flow;
- `SearchBar` получил отдельный индексный слой и меньше зависит от marker-логики напрямую.

Это значит, что архитектура фронта должна описывать не только Babylon scene, но и integration flow с backend.

## Текущая верхнеуровневая структура

Исходники разбиты на:

- `src/core`
- `src/features`
- `src/shared`
- `src/styles`
- `src/data`

В текущем виде это уже лучше плоской структуры, но несколько больших классов по-прежнему играют роль “центров тяжести”.

## Основные архитектурные зоны

### 1. `app` / bootstrap

Файл:

- `src/app.ts`

Ответственность:

- старт приложения;
- настройка контейнера зависимостей;
- запуск initial loading flow;
- запуск render loop;
- старт первой сцены и intro-анимаций.

`app.ts` должен оставаться максимально тонким bootstrap-слоем. Он не должен со временем превращаться в ещё один `UIManager`.

## 2. `core`

`core` — это техническая инфраструктура фронта.

Текущие подзоны:

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

### 2.1 `core/scene`

Ключевой файл:

- `scene-manager.ts`

Ответственность:

- создание и владение Babylon `Scene`;
- регистрация компонентов сцены;
- orchestration загрузки ресурсов;
- orchestration initialize/render/dispose;
- связывание `camera`, `building`, `markers`, `ui`.

Проблема:

- `SceneManager` уже достаточно крупный и знает слишком много о lifecycle разных подсистем;
- в нём смешаны:
  - registry компонентов,
  - loading pipeline,
  - initialization pipeline,
  - emergency fallback camera,
  - UI wiring.

Направление рефакторинга:

- сохранить его как central scene orchestrator;
- вынести из него отдельные responsibilities:
  - component registry
  - loading pipeline
  - post-load initialization

### 2.2 `core/ui`

Ключевые файлы:

- `ui-manager.ts`
- `ui-factory.ts`
- `loading-handler.ts`

Ответственность:

- orchestration верхнего UI;
- координация building switch / auth refresh / theme / QR / notifications;
- связывание `ControlPanel`, `SearchBar`, `BuildingTitle`, `MarkerDetailsPanel`, `AuthPopup`, `RouteManager`.

Проблема:

- `UIManager` — самый тяжёлый класс фронта;
- он содержит:
  - auth flow
  - building catalog flow
  - building reload flow
  - route reset
  - deep-link handling
  - QR scanner logic
  - theme switching
  - loading overlay control
  - floor button orchestration

То есть это главный кандидат на постепенное разбиение.

### 2.3 `core/route`

Ключевой файл:

- `route-manager.ts`

Ответственность:

- состояние маршрута;
- координация path selection;
- интеграция между UI и marker/path logic.

Это логическая зона, близкая к отдельному домену “navigation flow”, хотя физически она пока лежит в `core`.

### 2.4 `core/api`

Файлы:

- `api-client.ts`
- `building-api.ts`
- `marker-api.ts`

Ответственность:

- работа с backend API;
- JWT-aware запросы;
- загрузка building catalog и marker graph.

Эта зона уже выглядит относительно хорошо и ближе к infrastructure-слою.

## 3. `features`

`features` — предметные и визуальные части приложения.

Текущие зоны:

- `background`
- `building`
- `camera`
- `grid`
- `lighting`
- `markers`
- `ui`

### 3.1 `features/building`

Ключевые файлы:

- `building-manager.ts`
- `building-loader.ts`
- `building-parser.ts`
- `building-animator.ts`
- `floor-manager.ts`
- `floor-expander.ts`
- `wall-manager.ts`
- `connection-parser.ts`

Ответственность:

- загрузка и разбор модели здания;
- floor/wall representation;
- room/floor visibility;
- construction animation;
- access-aware floor and room handling.

Проблема:

- домен здания уже разделён лучше, чем раньше, но внутри него есть legacy parser-хвосты;
- `connection-parser.ts` и часть marker-related helper logic живут в building-зоне, хотя фактически уже влияют на navigation/access;
- `FloorManager` и `FloorExpander` остаются довольно тяжёлыми.

Направление рефакторинга:

- оставить `building` отдельным доменом;
- почистить parser/helper слой;
- уменьшить связность `building -> markers`.

### 3.2 `features/camera`

Ключевые файлы:

- `camera-manager.ts`
- `camera-animator.ts`
- `camera-input-handler.ts`
- `camera-mode-manager.ts`

Ответственность:

- режимы камеры;
- transition анимации;
- input handling;
- фокусировка на точках, этажах, маршрутах.

Эта зона уже достаточно доменно выделена. Здесь важнее не распил, а локальная чистка длинных методов и режима зависимостей.

### 3.3 `features/markers`

Ключевые файлы:

- `marker-manager.ts`
- `marker.ts`
- `marker-animator.ts`
- `graph/marker-graph.ts`
- `graph/marker-graph-renderer.ts`
- `pathfinder.ts`

Ответственность:

- marker lifecycle;
- marker visibility;
- marker graph;
- pathfinding;
- gateway access-aware behavior;
- rendering/selection/highlight.

Проблема:

- `MarkerManager` сейчас содержит сразу:
  - backend loading
  - graph rebuild
  - visibility policy
  - path state
  - selection state
  - gateway access visuals
  - input interaction

Это второй по приоритету кандидат на разбиение после `UIManager`.

### 3.4 `features/ui`

Подзоны:

- `control-panel`
- `connection`
- `details`
- `hud`
- `popup`
- `search`

Ответственность:

- конкретные UI-виджеты;
- мелкие локальные UI-сценарии.

Эта зона по структуре уже ближе к нормальной feature UI library. Главная проблема тут не модулизация, а локальные перегруженные виджеты:

- `control-panel.ts`
- `marker-details-panel.ts`
- `search-bar.ts`

## 4. `shared`

`shared` — общие типы, интерфейсы, константы и утилиты.

Подзоны:

- `constants`
- `errors`
- `helpers`
- `interfaces`
- `types`
- `utils`

Проблема:

- `shared` местами уже близок к “второму common-монолиту”;
- там лежат как действительно общие вещи, так и довольно доменные контракты.

Пока это не критично, но это зона для осторожной полировки:

- типы backend DTO можно позже группировать ближе к `core/api`;
- интерфейсы больших менеджеров можно дробить по доменам, а не держать всё в одном массиве abstractions.

## 5. `styles`

`styles` сейчас играют роль общей design system:

- base variables
- theme overrides
- component styles

Это хорошее направление. Основная цель здесь не архитектурный распил, а сохранение консистентности:

- одна система переменных;
- одна система theme tokens;
- меньше hardcoded colors в TS и CSS.

## Карта доменов фронта

Если смотреть не на текущие папки, а на смысловые домены, фронт уже фактически состоит из таких 6 зон:

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
- auth session storage
- backend-driven asset loading

Это и есть реальная frontend domain map. Она важнее текущей файловой структуры.

## Главные проблемные узлы

На текущем этапе самые тяжёлые и важные классы:

1. `core/ui/ui-manager.ts`
2. `features/markers/marker-manager.ts`
3. `core/scene/scene-manager.ts`
4. `features/ui/control-panel/control-panel.ts`
5. `features/camera/camera-manager.ts`
6. `features/building/floor-manager.ts`
7. `features/building/floor-expander.ts`

Это не значит, что их надо срочно переписывать. Это значит, что именно они должны быть центром последовательной чистки.

## Рекомендуемый порядок рефакторинга

### Этап 1. Зафиксировать карту

Что сделать:

- использовать этот документ как опорную карту frontend-рефакторинга;
- не резать файлы хаотично;
- все изменения проверять через сборку.

### Этап 2. Чистка мёртвого кода

Что делать:

- искать реально неиспользуемые файлы;
- удалять устаревшие parser/test/demo хвосты;
- убирать hardcoded fallback-ветки, которые больше не используются;
- вычищать временные debug paths.

### Этап 3. Разгрузка `UIManager`

Первая целевая декомпозиция:

- building switch orchestration
- auth/session refresh orchestration
- deep-link handler
- QR scanner flow
- loading overlay / scene transition flow

То есть `UIManager` должен стать тоньше, а не продолжать расти.

### Этап 4. Разгрузка `MarkerManager`

Вероятные кандидаты на выделение:

- marker visibility policy
- marker backend loading
- marker selection service
- gateway access visual policy
- path selection state

### Этап 5. Разгрузка `SceneManager`

Вероятные кандидаты на выделение:

- scene component registry
- scene loading orchestrator
- post-load initializer

### Этап 6. Полировка `building`-домена

Что смотреть:

- parser chain
- связь `FloorManager` / `FloorExpander`
- helper classes, которые сейчас логически уже ближе к navigation/access

### Этап 7. Документация

После чистки:

- обновить `README.md`;
- зафиксировать новые границы слоёв и flow;
- при желании описать sequence:
  - app start
  - scene load
  - building catalog sync
  - marker graph load
  - auth refresh
  - building switch

## Что не нужно делать

- не пытаться переписать frontend под новый framework;
- не превращать всё в “идеальную hexagonal architecture”;
- не плодить десятки интерфейсов ради чистоты;
- не дробить `shared` на много новых пакетов раньше времени;
- не ломать рабочий Babylon flow ради красивой схемы.

## Практический итог

Для frontend лучший путь сейчас такой:

1. зафиксировать доменную карту;
2. удалить мёртвый код и legacy-хвосты;
3. разгрузить `UIManager`, `MarkerManager`, `SceneManager`;
4. потом уже, если потребуется, доукладывать папки под более явную domain-oriented структуру.

Это даст понятный и безопасный путь рефакторинга без “гига-переписывания” с высоким риском регрессий.
