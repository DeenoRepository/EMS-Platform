# Регламент поставки кумулятивных патчей на продакшн-станцию (EMS-Platform)

Данный документ определяет **обязательный регламент и канонический формат** предоставления патчей для развертывания на целевой рабочий сервер (bare-metal станцию) с запущенным сервисом `ems-platform`.

---

## 🚨 Ключевые требования безопасности и сохранности данных

1. **Гарантия сохранности данных (Zero Data Loss)**:
   * Накат патча **НИ ПРИ КАКИХ ОБСТОЯТЕЛЬСТВАХ НЕ ДОЛЖЕН ПРИВОДИТЬ К ПОТЕРЕ ДАННЫХ**.
   * Сохраняются без изменений:
     - База данных PostgreSQL (все таблицы, пользователи, транзакции, журналы);
     - Пользовательские загрузки (`/opt/ems-platform/uploads/`, включая документы, чертежи, фото);
     - Конфигурации окружения (`/opt/ems-platform/.env.production`);
     - Сетевые настройки и сертификаты.
2. **Безопасность развертывания**:
   * Перед заменой скомпилированного бандла скрипт `scripts/baremetal-overlay-patch.sh` автоматически создает резервную копию предыдущего состояния приложения в `/var/backups/ems-platform/app-before-patch-<timestamp>.tar.gz`.
   * При сбое проверки работоспособности (health-check) служба автоматически откатывается на созданную точку восстановления.

---

## 🛠️ Процесс подготовки патча разработчиком / AI-агентом

Перед формированием патча агент обязан:

1. **Верифицировать изменения**:
   ```bash
   pnpm test
   ```
   Все тесты обязаны завершиться успешно (`pass`).
2. **Собрать продакшн-бандл**:
   ```bash
   pnpm build
   ```
   Сборка обязана завершиться без ошибок компиляции и типизации TypeScript.
3. **Сформировать архив и рассчитать контрольную сумму**:
   ```bash
   ./scripts/baremetal-patch-pack.sh ems-eps-document-model-patch
   ```
   *Скрипт формирует кумулятивный пакет, помещает архив в `/mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz` и генерирует файл контрольной суммы `sha256`.*
4. **Зафиксировать изменения в Git**:
   Оформить коммит по стандарту Conventional Commits.

---

## 📋 Обязательный канонический формат ответа агента

По завершении работ агент **ОБЯЗАН** предоставить финальный ответ пользователю **СТРОГО** в следующем утвержденном формате (с подстановкой актуальной контрольной суммы SHA-256):

```text
Финальный кумулятивный архив патча:
Файл: /mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz
Контрольная сумма SHA-256:
<АКТУАЛЬНАЯ_SHA256_СУММА_АРХИВА>
Инструкция по обновлению на рабочей станции:
Скопировать архив и проверить контрольную сумму:
cp /mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz /home/deps/
cd /home/deps
sha256sum ems-eps-document-model-patch.tar.gz
Ожидается:

<АКТУАЛЬНАЯ_SHA256_СУММА_АРХИВА>  ems-eps-document-model-patch.tar.gz
Распаковать:
sudo rm -rf /opt/ems-eps-document-model-patch
sudo mkdir -p /opt/ems-eps-document-model-patch

sudo tar -xzf /home/deps/ems-eps-document-model-patch.tar.gz \
  -C /opt/ems-eps-document-model-patch \
  --strip-components=1
Применить патч:
sudo env \
  EMS_PATCH_APPROVED=1 \
  EMS_INSTALL_DIR=/opt/ems-platform \
  EMS_SERVICE_NAME=ems-platform \
  /opt/ems-eps-document-model-patch/scripts/baremetal-overlay-patch.sh
Проверить статус:
sudo systemctl status ems-platform --no-pager
curl --fail http://127.0.0.1:3000/api/system/health
Обновить страницу браузера: Ctrl + Shift + R. Будет накатываться на продакшн сервер. Данные не должны быть потеряны
```

---

## 🔍 Описание этапов наката на рабочей станции

1. **Копирование и проверка целостности**:
   Архив копируется в изолированную директорию `/home/deps/`. Сверка SHA-256 исключает повреждение файла при передаче через разделяемую папку хоста.
2. **Распаковка**:
   Выполняется в отдельный каталог `/opt/ems-eps-document-model-patch` с ключом `--strip-components=1`, чтобы структура файлов развернулась непосредственно в корень целевой папки патча.
3. **Применение overlay-патча**:
   Скрипт `baremetal-overlay-patch.sh`:
   * Проверяет права root (`sudo`) и подтверждение `EMS_PATCH_APPROVED=1`;
   * Создает бэкап текущего билда в `/var/backups/ems-platform/`;
   * Останавливает сервис `systemctl stop ems-platform`;
   * Заменяет скомпилированные каталоги `apps/web/.next` и `apps/web/public`;
   * Выставляет корректные права `chown -R ems:ems`;
   * При наличии `scripts/patch-permissions.sql` обновляет права в БД;
   * Проверяет лимиты Nginx (`client_max_body_size 64M`);
   * Запускает сервис `systemctl start ems-platform`;
   * Производит до 30 попыток опроса `/api/system/health`.
4. **Контроль и сброс кэша**:
   После подтверждения `200 OK` от health-check пользователь обновляет вкладку браузера через `Ctrl + Shift + R` (сброс клиентского кэша Next.js).
