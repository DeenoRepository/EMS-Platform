# EMS-Platform — Docker smoke release candidate fd78f60

> **Неизменяемый снимок.** Фиксирует сборку и запуск production Docker stack
> из коммита `fd78f60` на Windows 11 / Docker Engine 29.4.3 / Compose 5.1.4.

**Дата:** 2026-08-31  
**Исходный коммит:** `fd78f60`  
**Образ:** `ems-platform-ems-web:rc-fd78f60`  
**Публичный локальный URL:** `http://127.0.0.1:8080`

> **Вердикт: ✅ runtime smoke PASS.** Production stack собран с нуля, миграция
> применена на чистую PostgreSQL БД, setup API создал администратора, login и
> authenticated-session API прошли, а состояние установки сохранилось после
> перезапуска web-контейнера.

## Выполненные проверки

| Проверка | Результат |
|---|---|
| Compose config с отдельным gitignored env-файлом | PASS |
| Случайные JWT/DB-секреты без placeholder-значений | PASS |
| Docker build из чистого контекста | PASS |
| Build context | 252.28 KB |
| Monorepo build внутри образа | PASS: 4/4 Turbo tasks |
| PostgreSQL healthcheck | PASS |
| Web healthcheck | PASS |
| Nginx startup / публичный порт 8080 | PASS |
| Prisma migration `20260831030000_init` | PASS |
| `GET /api/system/health` через Nginx | PASS: HTTP 200, `isReady: true` |
| `GET /login` через Nginx | PASS: HTTP 200 |
| Setup dependency checks | PASS: 5/5 |
| Инициализация через реальный `POST /api/setup/execute` | PASS |
| Вход через реальный `POST /api/auth/login` | PASS |
| Сессия через `GET /api/auth/me` | PASS: роль `admin` |
| Запуск приложения от non-root пользователя | PASS: `uid=1000(node)` |
| Повторный запуск миграций | PASS: no pending migrations |
| Сохранение install state после restart | PASS |
| Git working tree после очистки | CLEAN |

## Состояние запущенного стека

- `ems_postgres_prod` — healthy, наружу порт БД не опубликован.
- `ems_web_prod` — healthy, наружу порт приложения не опубликован.
- `ems_nginx_prod` — running, опубликован `8080 -> 80`.
- Named volumes: `ems_postgres_prod_data`, `ems_uploads_prod_data`.
- Временные генераторы env/smoke-проверки удалены после прогона.
- Локальные тестовые секреты и учётные данные находятся только в
  gitignored `.env.production` и не выводились в журналы/коммит.

## Очистка проекта

Удалены не относящиеся к EMS-Platform скрипты, читавшие локальную БД настроек
VS Code и код расширения Zoo, а также регенерируемые артефакты:

- `temp/` со старыми K4 quality JSON/TXT;
- coverage, Playwright report и test-results;
- TypeScript build info;
- Python `__pycache__`;
- временные Docker verification helpers.

Сохранены зависимости, пользовательская `.env` и uploads: их удаление через
полный `git clean -xd` было бы разрушительным, а не очисткой.

## Найденное ограничение

### [MEDIUM] Production image имеет размер 2.28 GB

Собранный образ `ems-platform-ems-web:rc-fd78f60` занимает **2.28 GB**. Причина:
финальный stage в [`Dockerfile`](../../../Dockerfile) копирует весь `/app` из
builder stage, включая workspace source, build tooling и dev dependencies.

Это **не блокирует runtime smoke**: стек здоров, миграции и функциональная
проверка проходят. Однако размер заметно ухудшает доставку, хранение и
поверхность атаки. Перед массовым распространением рекомендуется отдельная
задача на Next.js standalone output и production-only runtime dependencies.

## Команды управления локальным стеком

```bash
# Статус
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Логи
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Остановка без удаления данных
docker compose -f docker-compose.prod.yml --env-file .env.production down

# Полное удаление локальных проверочных данных
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```
