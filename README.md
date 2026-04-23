# IntMap Frontend

Frontend для интерактивной 3D-карты здания на `Babylon.js`.

Архитектурная карта frontend и план рефакторинга зафиксированы в [ARCHITECTURE.md](./ARCHITECTURE.md).

Проект больше не рассчитан на автономную работу с локальными `.glb` из репозитория. Текущая схема работы:

- frontend загружает каталог зданий с backend;
- frontend получает `FULL/FLOOR/ROOM` asset-URL через backend API;
- защищённые `glb`-asset'ы скачиваются через авторизованный запрос с JWT;
- маркеры, связи и маршруты приходят с backend.

## Текущее состояние frontend

После рефакторинга основные тяжёлые зоны уже частично разгружены:

- `UIManager` разложен на отдельные flow-классы;
- `MarkerManager` стал координатором поверх visibility/selection/loading/interaction/path сервисов;
- `SceneManager` разделён на registry и loading flow;
- из marker/building зоны убраны часть legacy-связей и мёртвого кода.

Это всё ещё не “идеальный” frontend, но текущая структура уже заметно читаемее и безопаснее для сопровождения.

## Зависимости

Для полноценной работы нужны:

- `intmap-backend`
- `PostgreSQL`
- `Redis`
- `MinIO`

Самый удобный способ запуска локально: общий `docker compose` из родительской директории:

```powershell
cd A:\Development\IntelliJ_Projects
docker compose up --build -d
```

После запуска:

- frontend: `http://localhost:8080`
- backend API: `http://localhost:8081`
- swagger: `http://localhost:8081/swagger-ui.html`
- health: `http://localhost:8081/actuator/health`

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

Продакшен-сборка:

```powershell
npm run build
```

Запуск dev-server:

```powershell
npm start
```

По умолчанию frontend ожидает backend на `http://localhost:8081/api/v1`, если открыт через `http://localhost:8080`.

При необходимости base URL можно переопределить в браузере:

```js
localStorage.setItem('intmap_api_base_url', 'http://localhost:8081/api/v1')
```

## Авторизация

JWT хранится в `localStorage` и автоматически подставляется во все API-запросы frontend.

Это важно для:

- загрузки защищённых asset'ов;
- скрытия/отображения ограниченных помещений и этажей;
- построения маршрутов с учётом прав доступа.

## Полезные команды

Проверка типов:

```powershell
npx tsc --noEmit
```

Очистка сборки:

```powershell
npm run clean
```

## Текущее ограничение

Frontend предполагает, что стартовые данные о зданиях приходят с backend. Если backend недоступен или в БД нет зданий, приложение покажет ошибку и не будет подгружать локальные тестовые модели.
