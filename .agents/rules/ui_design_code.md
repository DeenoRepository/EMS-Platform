# Дизайн-система и UI-компоненты — EMS-Platform

> Обновлено: 2026-08-30 (структурная реорганизация отчётности)
> Актуальные проверки качества: [`docs/quality/QUALITY_BASELINE.md`](../../docs/quality/QUALITY_BASELINE.md)
> История инспекций: [`docs/quality/inspections/`](../../docs/quality/inspections/)

---

## Принцип единого дизайн-кода

Все страницы и компоненты проекта обязаны использовать **единую библиотеку** `@/components/ui`.  
Это обеспечивает единообразие UX, доступность (a11y) и простоту темизации.

---

## 1. Обязательные Shared UI компоненты

### `StatCard` — KPI и метрики

```tsx
import { StatCard } from '@/components/ui';

// ✅ Правильно
<StatCard
  title="Всего оборудования"
  value={equipment.total}
  icon={<BuildIcon />}
  trend={{ value: 5, direction: 'up' }}
  loading={isLoading}
  onClick={() => applyFilter('status', 'ACTIVE')}
/>
```
❌ **Не создавать** самописные KPI-плашки с `<Paper>`, `<Typography>` и хардкодом размеров.

---

### `StatusBadge` — Статусы всех сущностей

```tsx
import { StatusBadge } from '@/components/ui';

// ✅ Правильно — для оборудования, ТМЦ, согласований, задач
<StatusBadge status="ACTIVE" />
<StatusBadge status="PENDING_APPROVAL" variant="outlined" />
<StatusBadge status="CRITICAL" size="small" />

// ❌ ЗАПРЕЩЕНО — самодельный статус через Chip
<Chip label="Активен" sx={{ bgcolor: '#dcfce7', color: '#166534' }} />
<Chip label="Критично" sx={{ bgcolor: '#fef2f2', color: '#dc2626' }} />
```

---

### `SearchInput` — Поле поиска с дебаунсом

```tsx
import { SearchInput } from '@/components/ui';

// ✅ Правильно — встроенный дебаунс 300мс, кнопка очистки
<SearchInput
  value={search}
  onChange={setSearch}
  placeholder="Поиск по названию, инв. номеру..."
/>

// ❌ ЗАПРЕЩЕНО — самописный TextField с ручным дебаунсом
<TextField onChange={(e) => setSearch(e.target.value)} />
```

---

### `FilterToolbar` — Панель фильтров

```tsx
import { FilterToolbar } from '@/components/ui';

// ✅ Правильно
<FilterToolbar
  filters={filterConfig}
  values={filterValues}
  onChange={setFilterValues}
  onReset={resetFilters}
  activeCount={activeFiltersCount}
/>
```

---

### `EmptyState` — Нулевые состояния

```tsx
import { EmptyState } from '@/components/ui';

// ✅ Правильно
<EmptyState
  icon={<BuildIcon />}
  title="Оборудование не найдено"
  description="Попробуйте изменить параметры поиска"
  action={{ label: 'Добавить оборудование', onClick: openWizard }}
/>

// ❌ ЗАПРЕЩЕНО — самописный empty state
<Box sx={{ textAlign: 'center', py: 8 }}>
  <Typography color="#94a3b8">Нет данных</Typography>
</Box>
```

---

### `DataTableWrapper` — Таблицы данных

```tsx
import { DataTableWrapper } from '@/components/ui';

// ✅ Правильно — stickyHeader, загрузка, пагинация встроены
<DataTableWrapper
  columns={columns}
  rows={data}
  loading={isLoading}
  pagination={{ page, pageSize, total, onPageChange }}
/>
```

---

### `ConfirmDialog` — Подтверждение опасных действий

```tsx
import { ConfirmDialog } from '@/components/ui';

// ✅ Обязательно для необратимых действий (удаление, сброс, списание)
<ConfirmDialog
  open={confirmOpen}
  title="Удалить оборудование?"
  description="Это действие необратимо. Все связанные данные будут удалены."
  confirmLabel="Удалить"
  confirmColor="error"
  onConfirm={handleDelete}
  onCancel={() => setConfirmOpen(false)}
/>
```

---

## 2. Цвета — Обязательное использование темы MUI

### ❌ ЗАПРЕЩЕНО — хардкод hex-цветов в sx-пропах:
```tsx
// Нарушение AGENTS.md §2 — обнаружено 153 раза в аудите
sx={{ color: '#0284c7' }}
sx={{ bgcolor: '#f8fafc' }}
sx={{ borderColor: '#e2e8f0' }}
sx={{ color: '#94a3b8' }}
sx={{ backgroundColor: '#0b1120' }}
```

### ✅ ПРАВИЛЬНО — семантические токены темы:
```tsx
// Через palette токены
sx={{ color: 'primary.main' }}          // вместо '#0284c7'
sx={{ color: 'primary.dark' }}          // вместо '#0369a1'
sx={{ color: 'text.secondary' }}        // вместо '#64748b', '#94a3b8'
sx={{ color: 'text.primary' }}          // вместо '#0f172a', '#1e293b'
sx={{ color: 'text.disabled' }}         // вместо '#94a3b8' в иконках
sx={{ bgcolor: 'background.paper' }}    // вместо '#ffffff', '#f8fafc'
sx={{ bgcolor: 'background.default' }}  // вместо '#f1f5f9'
sx={{ bgcolor: 'grey.50' }}             // вместо '#f8fafc'
sx={{ bgcolor: 'grey.100' }}            // вместо '#f1f5f9'
sx={{ borderColor: 'divider' }}         // вместо '#e2e8f0', '#cbd5e1'
sx={{ color: 'error.main' }}            // вместо '#dc2626', '#ef4444'
sx={{ color: 'error.dark' }}            // вместо '#991b1b'
sx={{ bgcolor: 'error.light' }}         // вместо '#fef2f2'
sx={{ color: 'success.main' }}          // вместо '#16a34a', '#15803d'
sx={{ bgcolor: 'success.light' }}       // вместо '#f0fdf4'
sx={{ color: 'warning.main' }}          // вместо '#d97706', '#ea580c'
sx={{ bgcolor: 'warning.light' }}       // вместо '#fffbeb'
sx={{ borderColor: 'warning.light' }}   // вместо '#fed7aa'
```

### Таблица замен (часто встречающиеся нарушения):

| Хардкод | Правильный токен |
|---|---|
| `#0284c7` | `primary.main` |
| `#0369a1` | `primary.dark` |
| `#0b1120` | Специфичный фон логина — допустимо в одном месте |
| `#ffffff` | `background.paper` |
| `#f8fafc` | `grey.50` или `background.default` |
| `#f1f5f9` | `grey.100` |
| `#e2e8f0` | `divider` |
| `#cbd5e1` | `divider` (более тёмный) |
| `#94a3b8` | `text.disabled` |
| `#64748b` | `text.secondary` |
| `#475569` | `text.secondary` |
| `#334155` | `text.primary` |
| `#0f172a` | `text.primary` |
| `#1e293b` | `text.primary` |
| `#dc2626` | `error.main` |
| `#ef4444` | `error.main` |
| `#16a34a` | `success.main` |
| `#7c3aed` | `secondary.main` или `purple[700]` |
| `#d97706` | `warning.main` |

---

## 3. Правила для иконок в EmptyState

Иконки в `<EmptyState>` должны использовать токен цвета, не хардкод:

```tsx
// ❌ ЗАПРЕЩЕНО
icon={<CalendarMonthIcon sx={{ fontSize: 44, color: '#94a3b8' }} />}

// ✅ ПРАВИЛЬНО
icon={<CalendarMonthIcon sx={{ fontSize: 44, color: 'text.disabled' }} />}
```

---

## 4. Правила для `<Chip>` компонента

`<Chip>` допустим только для **нейтральных меток** (технические коды, артикулы, теги):

```tsx
// ✅ Допустимо — нейтральная метка, не статус
<Chip label={w.code} size="small" variant="outlined" sx={{ borderRadius: '4px' }} />
<Chip label={`Код: ${item.article}`} size="small" variant="outlined" />

// ❌ ЗАПРЕЩЕНО — статус через Chip
<Chip label="Активен" sx={{ bgcolor: '#dcfce7', color: '#166534' }} />
<Chip label="Критично" sx={{ bgcolor: '#fef2f2', color: '#dc2626' }} />
// → Использовать <StatusBadge status="ACTIVE" /> / <StatusBadge status="CRITICAL" />
```

---

## 5. Структура компонентов в ui/

При добавлении нового общего компонента:

1. Создать файл `apps/web/src/components/ui/MyNewComponent.tsx`
2. Экспортировать из `apps/web/src/components/ui/index.ts`
3. Использовать MUI тему (не хардкод цветов)
4. Добавить prop `loading?: boolean` если компонент отображает данные
5. Применить во **всех** модулях где нужен (EPS, WMS, SRM, MRO, Admin)
