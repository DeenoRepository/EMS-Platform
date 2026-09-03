# Архитектурный план миграции и регламент агентной разработки EMS Platform

Данная директория содержит полный комплекс документации, архитектурных спецификаций, правил и дорожных карт для перехода EMS Platform от монолитного состояния к микроядерной расширяемой архитектуре (Microkernel / Plugin Architecture) в формате независимых мульти-репозиториев.

---

## 🧭 Навигация по разделам плана

| Документ | Содержание |
|---|---|
| [`architecture-migration-plan/00-master-migration-plan.md`](architecture-migration-plan/00-master-migration-plan.md) | **Мастер-план миграции**: этапы, фазы, стратегия Strangler Fig, критерии готовности (DoD), целевые метрики надежности на 50 пользователей. |
| [`architecture-migration-plan/01-target-architecture.md`](architecture-migration-plan/01-target-architecture.md) | **Целевая архитектура**: Core Shell, Business Modules, Core Extensions, Event Bus, модель изоляции данных и контрактов. |
| [`architecture-migration-plan/02-agent-governance-and-rules.md`](architecture-migration-plan/02-agent-governance-and-rules.md) | **Регламент для ИИ-агентов**: протокол рукопожатия (handshake), изоляция правил в отдельном репозитории, полное отсутствие AI-артефактов в рабочем коде, TDD-режим без UI-тестирования, Git-коммиты. |
| [`architecture-migration-plan/03-claude-skills-catalog.md`](architecture-migration-plan/03-claude-skills-catalog.md) | **Каталог скиллов**: подборка инструментов из [`alirezarezvani/claude-skills`](https://github.com/alirezarezvani/claude-skills), маппинг скиллов на роли и жизненный цикл разработки/деплоя. |
| [`architecture-migration-plan/04-components-roadmap.md`](architecture-migration-plan/04-components-roadmap.md) | **Детальная декомпозиция компонентов**: пошаговые планы для ядра (`platform-shell`), контрактов (`platform-contracts`), расширений (`ext-*`) и бизнес-модулей (`module-eps`, `module-wms`, `module-mro`, `module-prm`). |
| [`architecture-migration-plan/05-adr-ui-integration.md`](architecture-migration-plan/05-adr-ui-integration.md) | **ADR-0002**: Архитектура интеграции пользовательского интерфейса (Microfrontends / Module Federation vs Distribution Assembly). |

---

## 🎯 Ключевые архитектурные принципы

1. **Строгая независимость модулей:** Никаких прямых импортов между бизнес-модулями. Взаимодействие — только через события шины сообщений.
2. **Изоляция базы данных:** Каждый модуль владеет собственным пространством данных (схемой или набором таблиц). Внешние ключи между таблицами разных модулей в СУБД запрещены.
3. **Расширяемость ядра (Core Extensions):** Технические возможности (LDAP, S3, Syslog) подключаются как плагины в SPI-точки расширения ядра.
4. **Автономность репозиториев:** Каждый модуль, расширение и ядро ведутся в отдельных репозиториях.
5. **Чистота кодовой базы:** В репозиториях модулей и ядра нет следов агентных инструкций, промптов или `.agents/` каталогов. Все агентные инструкции хранятся в отдельном репозитории `platform-governance`.
6. **TDD для бизнес-логики:** 100% покрытие сервисов, обработчиков и расчетов тестами. UI-компоненты освобождены от unit-тестирования.
