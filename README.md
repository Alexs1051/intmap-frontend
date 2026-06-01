# IntMap Frontend

Frontend-часть `IntMap` — это клиентское приложение для интерактивной 3D-навигации по зданиям.  
Приложение визуализирует модель здания, этажи, помещения, маркеры, gateway, маршруты и ролевые ограничения доступа.

Текущая версия frontend уже не является локальным viewer'ом для `.glb` из репозитория.  
Он работает как клиент к backend API и получает от него:

- список зданий;
- информацию о текущей ревизии модели;
- список asset-файлов здания;
- маркеры и связи;
- маршрут между точками;
- deep-link и QR-сценарии;
- роль пользователя и ограничения доступа.

## Назначение frontend

Frontend отвечает за:

- визуализацию 3D-модели здания на `Babylon.js`;
- отображение и скрытие этажей, комнат и ограниченных зон;
- интерактивную работу с маркерами, флагами, gateway и waypoint;
- отображение UI-панелей и модальных окон;
- авторизацию пользователя и смену UI-состояния по роли;
- загрузку моделей через backend;
- deep-link и QR-code сценарии;
- построение и визуализацию маршрута между маркерами.

## Основные технологии

Стек frontend:

- `TypeScript`
- `Webpack 5`
- `Babylon.js`
- `InversifyJS`
- `HTML + CSS`
- `Font Awesome`
- `QR Scanner`

Инфраструктурные и вспомогательные части:

- собственный `EventBus`
- DI-контейнер
- модульная структура `core / features / shared / styles`
- backend-driven загрузка моделей и графа навигации

## Архитектурный стиль

Frontend организован как **domain-oriented client application** с тонким bootstrap-слоем и несколькими крупными предметными зонами:

- `bootstrap`
- `scene`
- `building`
- `navigation`
- `ui-shell`
- `integration`

После рефакторинга проект больше не держится на одном “божественном” менеджере.  
Самые тяжёлые зоны были разложены на более узкие orchestration и service-классы.

Подробная архитектурная карта вынесена в:

- [ARCHITECTURE.md](</A:/Development/IntelliJ_Projects/intmap-frontend/ARCHITECTURE.md>)

Функциональные пользовательские сценарии и UX-потоки описаны отдельно:

- [FUNCTIONALITY.md](</A:/Development/IntelliJ_Projects/intmap-frontend/FUNCTIONALITY.md>)

## Что было сделано в ходе рефакторинга

Основные изменения frontend:

- удалены хвосты старой локальной модели и часть legacy fallback-логики;
- `UIManager` разделён на отдельные flow-классы;
- `MarkerManager` превращён в orchestration-слой поверх специальных marker-сервисов;
- `SceneManager` разделён на registry и loading flow;
- поиск (`SearchBar`) отделён от слоя индексации и фильтрации;
- часть `any` и неявных связей заменена интерфейсами;
- загрузка защищённых GLB-asset'ов переведена на авторизованный fetch через JWT;
- исправлены проблемы с backend absolute URLs и mixed content для HTTPS-сценария;
- добавлены экран загрузки, переработаны темы, улучшены мобильные сценарии;
- вычищена часть мёртвого кода, старых тестовых данных и неиспользуемых файлов.

## Текущая структура исходников

Ключевые каталоги:

- `src/app.ts` — bootstrap приложения
- `src/core` — инфраструктура frontend
- `src/features` — предметные и UI-фичи
- `src/shared` — типы, интерфейсы, константы, утилиты
- `src/styles` — общая система стилей и тем
- `public` — статические web-ресурсы

### Основные зоны `src/core`

- `core/api` — работа с backend API и JWT-aware fetch
- `core/di` — контейнер зависимостей
- `core/events` — EventBus и события
- `core/logger` — логирование
- `core/route` — route orchestration
- `core/scene` — lifecycle сцены и загрузка
- `core/ui` — orchestration верхнего UI

### Основные зоны `src/features`

- `features/building` — загрузка и разбор модели, этажи, стены, анимация
- `features/camera` — камера и её режимы
- `features/markers` — маркеры, связи, граф, pathfinding
- `features/ui` — все видимые пользователю UI-компоненты
- `features/grid`, `lighting`, `background` — визуальное окружение сцены

## Ключевые менеджеры и сервисы

### `app.ts`

Роль:

- инициализация приложения;
- сбор зависимостей через контейнер;
- запуск первой загрузки сцены;
- старт render loop;
- обработка критических ошибок старта.

### `SceneManager`

Роль:

- владение Babylon `Scene`;
- orchestration полной загрузки сцены;
- регистрация компонентов;
- связывание `camera`, `building`, `markers`, `ui`.

После рефакторинга его обязанности разделены между:

- `scene-manager.ts`
- `scene-manager-registry.ts`
- `scene-manager-loading-flow.ts`

### `UIManager`

Роль:

- orchestration пользовательского интерфейса;
- смена здания;
- синхронизация auth/session flow;
- deep-link flow;
- QR flow;
- loading/notification/theme orchestration;
- связь между UI и 3D-сценой.

После рефакторинга в `core/ui` выделены:

- `ui-manager-building-flow.ts`
- `ui-manager-control-flow.ts`
- `ui-manager-session-flow.ts`
- `ui-manager-deep-link-flow.ts`
- `ui-manager-qr-scanner.ts`

### `BuildingManager`

Роль:

- загрузка здания;
- orchestration парсинга и разборки модели;
- взаимодействие с этажами;
- construction animation;
- переключение между полным зданием и этажными asset'ами.

### `MarkerManager`

Роль:

- lifecycle маркеров;
- orchestration видимости;
- selection state;
- backend loading графа;
- path highlighting;
- интеграция с камерой и UI.

После рефакторинга логика вынесена в:

- `marker-loading-service.ts`
- `marker-visibility-service.ts`
- `marker-selection-service.ts`
- `marker-interaction-service.ts`
- `marker-path-service.ts`

### `CameraManager`

Роль:

- режимы камеры;
- фокусировка на маркере/этаже/точке;
- анимации переходов;
- переключение top-down/free-orbit сценариев.

## Backend-интеграция

Frontend использует backend как основной источник данных.

### Используемые API-клиенты

- `AuthApi`
- `BuildingApi`
- `MarkerApi`
- `RouteApi`
- общий `api-client.ts`

### Что приходит с backend

- список зданий;
- `model-info` по зданию;
- asset-список ревизии;
- маркеры по зданию;
- связи между маркерами;
- маршрут между маркерами;
- deep-link resolve по флагу;
- JWT после авторизации.

### Особенность загрузки моделей

Frontend не ходит напрямую в MinIO.

Текущая схема:

1. frontend получает `modelUrl` и `assetUrl` от backend;
2. если URL защищён, `building-loader.ts` скачивает его через `apiFetch` с JWT;
3. ответ превращается в `blob:` URL;
4. Babylon загружает уже локальный blob-ресурс.

Это было сделано для корректной работы:

- закрытых asset-файлов;
- ролевого доступа;
- Docker/VPS reverse proxy сценариев;
- HTTPS/mixed content сценариев.

## Пользовательский функционал

Frontend поддерживает:

- загрузку каталога зданий;
- переключение между зданиями;
- переключение между этажами;
- раскрытие и сборку этажей;
- поиск по маркерам;
- фокусировку камеры по поиску и по деталям маркера;
- отображение деталей маркера;
- построение маршрута;
- отображение restricted помещений и gateway;
- авторизацию и деавторизацию;
- QR scanner;
- deep-link вход по флагу;
- светлую и тёмную тему;
- адаптацию под мобильные устройства.

Подробный перечень пользовательских сценариев:

- [FUNCTIONALITY.md](</A:/Development/IntelliJ_Projects/intmap-frontend/FUNCTIONALITY.md>)

## Темы и визуальный стиль

Frontend поддерживает:

- `light theme`
- `dark theme`

Что уже было улучшено:

- loading screen приведён к общему стилю;
- красный акцент используется как ключевой для тёмной темы;
- синий акцент вынесен в светлую тему;
- улучшены мобильные layout и модальные окна;
- QR scanner адаптирован под portrait/landscape.

## Локальная разработка

Установка зависимостей:

```powershell
cd A:\Development\IntelliJ_Projects\intmap-frontend
npm ci
```

Dev-сборка:

```powershell
npm run build:dev
```

Production-сборка:

```powershell
npm run build
```

Dev-server:

```powershell
npm start
```

Проверка типов:

```powershell
npx tsc --noEmit
```

Очистка:

```powershell
npm run clean
```

## Локальный запуск в составе стека

Самый удобный способ:

```powershell
cd A:\Development\IntelliJ_Projects
docker compose up --build -d
```

Сервисы:

- frontend: `http://localhost:8080`
- backend API: `http://localhost:8081`
- swagger: `http://localhost:8081/swagger-ui.html`
- actuator health: `http://localhost:8081/actuator/health`

## HTTPS и серверный runtime

Для VPS используется runtime-схема:

- frontend собирается локально в `dist`
- backend собирается локально в `app.jar`
- на сервер загружаются только runtime-артефакты

Причина:

- слабый VPS не должен тратить память на `webpack build` и `Gradle + Kotlin + KAPT`

Подробности:

- [DEPLOY.md](</A:/Development/IntelliJ_Projects/DEPLOY.md>)

## Текущее состояние frontend

На текущем этапе frontend:

- стабильно работает с backend-driven моделью данных;
- поддерживает HTTPS через reverse proxy;
- работает на ПК и на мобильных устройствах;
- поддерживает QR и deep-link flow;
- корректно учитывает роли и ограничения доступа;
- имеет заметно более читаемую архитектуру, чем исходная версия.

## Технический долг

Что ещё можно улучшать дальше, но уже не критично для дипломного состояния:

- дальнейшая полировка `ControlPanel` и части вложенных анимаций;
- точечная чистка оставшихся `any` и glue-кода;
- упрощение части parser/helper цепочек в `features/building`;
- дополнительная декомпозиция некоторых UI-виджетов;
- архитектурная полировка `shared`-слоя.

На текущий момент frontend уже достаточно подробно структурирован и документирован для использования в дипломном отчёте.
