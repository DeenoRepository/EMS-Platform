---
id: K4
title: РЎРЅРёР·РёС‚СЊ СЂРµР°Р»СЊРЅСѓСЋ С†РёРєР»РѕРјР°С‚РёС‡РµСЃРєСѓСЋ СЃР»РѕР¶РЅРѕСЃС‚СЊ РїСЂРёРѕСЂРёС‚РµС‚РЅС‹С… С„СѓРЅРєС†РёР№
status: done
phase: K
priority: P2
risk: medium
skills: [senior-frontend, senior-backend, zero-hallucination-coder]
opened: 2026-08-30
closed: 2026-08-30
commits: [5ef7e08, 6dd9624, d7b0bd6, f54b0c8, a84ccab, dc36a68, 92ede6f]
gates: [test, lint, tsc, check:quality, check:docs]
---

# K4 вЂ” РЎРЅРёР·РёС‚СЊ СЂРµР°Р»СЊРЅСѓСЋ С†РёРєР»РѕРјР°С‚РёС‡РµСЃРєСѓСЋ СЃР»РѕР¶РЅРѕСЃС‚СЊ РїСЂРёРѕСЂРёС‚РµС‚РЅС‹С… С„СѓРЅРєС†РёР№

## Problem

РџРѕСЃР»Рµ Phase I РІ web РѕСЃС‚Р°СЋС‚СЃСЏ С„СѓРЅРєС†РёРё РІС‹С€Рµ РЅРѕСЂРјР°С‚РёРІРЅРѕРіРѕ РїРѕСЂРѕРіР° СЃР»РѕР¶РЅРѕСЃС‚Рё.
РџСЂРёРѕСЂРёС‚РµС‚ РёРЅСЃРїРµРєС†РёРё вЂ” СЂРµР°Р»СЊРЅР°СЏ Р±РёР·РЅРµСЃ-Р»РѕРіРёРєР°, Р° РЅРµ РёР·РІРµСЃС‚РЅС‹Рµ TSX
false-positive РіСЂР°РЅРёС†С‹ render-С„СѓРЅРєС†РёР№. РќР°РёР±РѕР»РµРµ С†РµРЅРЅС‹Рµ С†РµР»Рё: РѕР±СЂР°Р±РѕС‚С‡РёРє
СЃРѕС…СЂР°РЅРµРЅРёСЏ WMS warehouses, setup LDAP test handler, Р·Р°РіСЂСѓР·С‡РёРє СЃС‚Р°С‚РёСЃС‚РёРєРё WMS,
`makeEnglishSlug`, Р° С‚Р°РєР¶Рµ РѕС‚РґРµР»СЊРЅС‹Рµ SRM/WMS dialog handlers.

## Scope

- Р’С‹РїРѕР»РЅСЏС‚СЊ РґРµРєРѕРјРїРѕР·РёС†РёСЋ РѕС‚РґРµР»СЊРЅС‹РјРё bounded-РїРѕРґРёСЃС‚РѕСЂРёСЏРјРё, РїРѕ РѕРґРЅРѕР№ Р»РѕРіРёС‡РµСЃРєРѕР№
  РѕР±Р»Р°СЃС‚Рё Р·Р° commit.
- РЎРЅР°С‡Р°Р»Р° РїРѕРєСЂС‹С‚СЊ С‡РёСЃС‚С‹Рµ builders/validators/models С‚РµСЃС‚Р°РјРё, Р·Р°С‚РµРј СЃРѕРєСЂР°С‚РёС‚СЊ
  orchestration handlers.
- РЎРѕС…СЂР°РЅРёС‚СЊ API-РєРѕРЅС‚СЂР°РєС‚С‹, РїСЂР°РІР°, rate limiting, UI-РїРѕРІРµРґРµРЅРёРµ Рё Prisma semantics.
- РќРµ СЂРµС„Р°РєС‚РѕСЂРёС‚СЊ presentation-only F-grade С„Р°Р№Р»С‹ С‚РѕР»СЊРєРѕ СЂР°РґРё score.
- РќРµ РІС‹РїРѕР»РЅСЏС‚СЊ РјР°СЃСЃРѕРІСѓСЋ Р·Р°РјРµРЅСѓ layout magic numbers РёР»Рё С‚РёРїРѕРІ.

## Steps

1. РџРѕРІС‚РѕСЂРЅРѕ РёР·РјРµСЂРёС‚СЊ РєР°РЅРґРёРґР°С‚РѕРІ С‡РµСЂРµР· quality checker Рё РїСЂРѕРІРµСЂРёС‚СЊ РіСЂР°РЅРёС†С‹
   С„СѓРЅРєС†РёР№ С‡С‚РµРЅРёРµРј РёСЃС…РѕРґРЅРёРєРѕРІ.
2. РЎРѕР·РґР°С‚СЊ РѕС‚РґРµР»СЊРЅСѓСЋ story РґР»СЏ РїРµСЂРІРѕР№ С„СѓРЅРєС†РёРё СЃ РјР°РєСЃРёРјР°Р»СЊРЅС‹Рј СЂРµР°Р»СЊРЅС‹Рј `cx`.
3. Р’С‹РЅРµСЃС‚Рё pure validation/payload/response helpers СЂСЏРґРѕРј СЃ РІР»Р°РґРµР»СЊС†РµРј.
4. Р”РѕР±Р°РІРёС‚СЊ С‚РµСЃС‚С‹ РЅР° РІРµС‚РІР»РµРЅРёСЏ Рё РѕС€РёР±РєРё, РЅРµ РјРµРЅСЏСЏ РІРЅРµС€РЅРёР№ РєРѕРЅС‚СЂР°РєС‚.
5. РџРѕРІС‚РѕСЂРёС‚СЊ РґР»СЏ СЃР»РµРґСѓСЋС‰РёС… РєР°РЅРґРёРґР°С‚РѕРІ, Р·Р°РєСЂС‹РІР°СЏ РєР°Р¶РґСѓСЋ story РѕС‚РґРµР»СЊРЅС‹Рј
   Conventional Commit.

## Definition of Done

- [x] Для каждой подистории целевая функция имеет complexity ≤ 10 либо
  документированное обоснование исключения.
- [x] Поведение покрыто тестами до/после рефакторинга.
- [x] Нет новых F-grade regressions; lint/tsc/test gates зелёные.
- [x] Изменения не смешивают security, UI и unrelated refactoring.

## Result

РЁР°Рі 1 РІС‹РїРѕР»РЅРµРЅ 2026-08-30: quality checker РїРѕРІС‚РѕСЂРЅРѕ РёР·РјРµСЂРёР» РєР°РЅРґРёРґР°С‚РѕРІ,
РїРѕСЃР»Рµ С‡РµРіРѕ РіСЂР°РЅРёС†С‹ С„СѓРЅРєС†РёР№ РїСЂРѕРІРµСЂРµРЅС‹ С‡С‚РµРЅРёРµРј РёСЃС…РѕРґРЅРёРєРѕРІ. РњР°РєСЃРёРјР°Р»СЊРЅР°СЏ СЂРµР°Р»СЊРЅР°СЏ
С†РёРєР»РѕРјР°С‚РёС‡РµСЃРєР°СЏ СЃР»РѕР¶РЅРѕСЃС‚СЊ СЃСЂРµРґРё РїСЂРѕРІРµСЂРµРЅРЅС‹С… РїСЂРёРѕСЂРёС‚РµС‚РЅС‹С… РєР°РЅРґРёРґР°С‚РѕРІ вЂ” `loadData`
РІ [`Sidebar.tsx`](../../../apps/web/src/components/layout/Sidebar.tsx): `cx 46`,
79 СЃС‚СЂРѕРє, СЃРµРјСЊ РЅРµР·Р°РІРёСЃРёРјС‹С… response branches. Presentation-only Рё РёР·РІРµСЃС‚РЅС‹Рµ
false-positive РєР°РЅРґРёРґР°С‚С‹ РёСЃРєР»СЋС‡РµРЅС‹ РёР· РїСЂРёРѕСЂРёС‚РµС‚Р°.

РџРµСЂРІР°СЏ bounded-РїРѕРґРёСЃС‚РѕСЂРёСЏ СЃРѕР·РґР°РЅР° РІ
[`K4.1-sidebar-load-data.md`](K4.1-sidebar-load-data.md): РІС‹РЅРµСЃС‚Рё С‚РѕР»СЊРєРѕ
orchestration/response mapping `loadData`, Р·Р°С‚РµРј РїРѕРєСЂС‹С‚СЊ РІРµС‚РІР»РµРЅРёСЏ pure helper
С‚РµСЃС‚Р°РјРё Рё РїСЂРѕРІРµСЂРёС‚СЊ РѕС‚СЃСѓС‚СЃС‚РІРёРµ РёР·РјРµРЅРµРЅРёР№ sidebar/API-РїРѕРІРµРґРµРЅРёСЏ.

Р’С‚РѕСЂР°СЏ bounded-РїРѕРґРёСЃС‚РѕСЂРёСЏ [`K4.2-wms-warehouses-handle-submit.md`](K4.2-wms-warehouses-handle-submit.md)
Р·Р°РєСЂС‹С‚Р° РєРѕРјРјРёС‚РѕРј `5ef7e08`: request execution Рё response mapping СЃРѕС…СЂР°РЅРµРЅРёСЏ
СЃРєР»Р°РґРѕРІ РІС‹РЅРµСЃРµРЅС‹ РёР· `handleSubmit`, РґРѕР±Р°РІР»РµРЅС‹ focused tests, Р° РѕСЃС‚Р°С‚РѕС‡РЅР°СЏ
СЃР»РѕР¶РЅРѕСЃС‚СЊ `cx 12` РґРѕРєСѓРјРµРЅС‚РёСЂРѕРІР°РЅР° РєР°Рє orchestration boundary СЃ РґРІСѓРјСЏ
РЅРµСѓСЃС‚СЂР°РЅРёРјС‹РјРё Р±РµР· РёР·РјРµРЅРµРЅРёСЏ РїРѕРІРµРґРµРЅРёСЏ РІРµС‚РІР»РµРЅРёСЏРјРё. Р’СЃРµ gates Р·РµР»С‘РЅС‹Рµ.

РўСЂРµС‚СЊСЏ bounded-РїРѕРґРёСЃС‚РѕСЂРёСЏ [`K4.3-setup-ldap-auth-handler.md`](K4.3-setup-ldap-auth-handler.md)
СЂРµР°Р»РёР·РѕРІР°РЅР° 2026-08-30: response Рё network-error mapping РїСЂРѕРІРµСЂРєРё LDAP
РІС‹РЅРµСЃРµРЅС‹ РёР· `handleTestLdapAuth`, РґРѕР±Р°РІР»РµРЅС‹ focused tests, Р° complexity С„СѓРЅРєС†РёРё
СЃРЅРёР¶РµРЅР° СЃ `cx 13` РґРѕ `cx 4`. РџРѕР»РЅС‹Рµ test, lint, web tsc Рё quality gates Р·РµР»С‘РЅС‹Рµ;
stage РѕР¶РёРґР°РµС‚ РѕС‚РґРµР»СЊРЅРѕРіРѕ Conventional Commit.

Р§РµС‚РІС‘СЂС‚Р°СЏ bounded-РїРѕРґРёСЃС‚РѕСЂРёСЏ [`K4.4-eps-import-slug-builder.md`](K4.4-eps-import-slug-builder.md)
Р·Р°РєСЂС‹С‚Р° РєРѕРјРјРёС‚РѕРј `8bad0d4` Рё РѕС„РѕСЂРјР»РµРЅР° ledger-РєРѕРјРјРёС‚РѕРј `e68230a`: РёР·
`makeEnglishSlug` РІС‹РЅРµСЃРµРЅС‹ canonical lookup, translation Рё slug sanitization
helpers, РґРѕР±Р°РІР»РµРЅС‹ 5 focused tests. РџСѓР±Р»РёС‡РЅС‹Р№ API Рё РµРґРёРЅСЃС‚РІРµРЅРЅС‹Р№ consumer РІ
`eps-import-matcher.ts` РЅРµ РёР·РјРµРЅРµРЅС‹. РџРѕР»РЅС‹Рµ test, lint, web tsc Рё quality gates
Р·РµР»С‘РЅС‹Рµ; quality baseline РїРѕСЃР»Рµ stage РїРѕРєР°Р·С‹РІР°РµС‚ 23 F-grade files Рё 2339 code
smells РІ `apps/web/src`.

РџСЏС‚РѕРµ РёР·РјРµСЂРµРЅРёРµ РїРѕСЃР»Рµ K4.4: РјР°РєСЃРёРјР°Р»СЊРЅС‹Р№ СЂРµР°Р»СЊРЅС‹Р№ РєР°РЅРґРёРґР°С‚ вЂ”
`WmsOperationWizardDialog` СЃ `cx 42` / 178 СЃС‚СЂРѕРєР°РјРё. Bounded-РїРѕРґРёСЃС‚РѕСЂРёСЏ K4.5
РІС‹РЅРµСЃР»Р° submit orchestration/payload execution, СЃРЅРёР·РёРІ `handleSubmit` РґРѕ
`cx 5` / 27 СЃС‚СЂРѕРє. Р¤РѕРєСѓСЃРёСЂРѕРІР°РЅРЅС‹Рµ С‚РµСЃС‚С‹ Рё РІСЃРµ gates Р·РµР»С‘РЅС‹Рµ; Р·Р°РєСЂС‹С‚Р° РєРѕРјРјРёС‚РѕРј
`669ddc3`, ledger РѕС„РѕСЂРјР»РµРЅ РєРѕРјРјРёС‚РѕРј `4a95456`.

РЁРµСЃС‚РѕРµ РёР·РјРµСЂРµРЅРёРµ 2026-08-30: РјР°РєСЃРёРјР°Р»СЊРЅС‹Р№ РїСЂРѕРІРµСЂРµРЅРЅС‹Р№ СЂРµР°Р»СЊРЅС‹Р№ РєР°РЅРґРёРґР°С‚ вЂ”
[`getSystemSettings()`](../../../apps/web/src/lib/system-settings-service.ts:29) СЃ
`cx 32` Рё 65 СЃС‚СЂРѕРєР°РјРё. Bounded-РїРѕРґРёСЃС‚РѕСЂРёСЏ K4.6 РІС‹РЅРµСЃР»Р° pure config construction
Рё env/database fallback mapping РІ
[`system-settings-builder.ts`](../../../apps/web/src/lib/system-settings-builder.ts),
РґРѕР±Р°РІР»Р° 4 focused tests Рё СЃРЅРёР·РёР»Р° service function РґРѕ `cx 4` / 28 СЃС‚СЂРѕРє.
Targeted/full tests, lint, web tsc Рё quality Р·РµР»С‘РЅС‹Рµ; stage Р·Р°РєСЂС‹С‚Р° РєРѕРјРјРёС‚РѕРј
`d7b0bd6`. РСЃС‚РѕСЂРёС‡РµСЃРєР°СЏ docs-link РїСЂРѕРІРµСЂРєР° РїРѕСЃР»Рµ stage РІС‹СЏРІРёР»Р° СѓСЃС‚Р°СЂРµРІС€РёРµ
РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅС‹Рµ СЃСЃС‹Р»РєРё РІ СЂР°РЅРµРµ Р·Р°РєСЂС‹С‚РѕР№ K4.6 story; РѕРЅРё РЅРµ РѕС‚РЅРѕСЃСЏС‚СЃСЏ Рє С‚РµРєСѓС‰РµРјСѓ
K4.7 source change.

РЎРµРґСЊРјРѕРµ РёР·РјРµСЂРµРЅРёРµ 2026-08-30: РїРѕСЃР»Рµ K4.6 РјР°РєСЃРёРјР°Р»СЊРЅС‹Р№ С‡РёСЃР»РѕРІРѕР№ СЂРµР·СѓР»СЊС‚Р°С‚
checker вЂ” `WmsOperationWizardDialog` `cx 42`, РЅРѕ СЌС‚Рѕ presentation boundary.
РџРµСЂРІС‹Р№ СЃР»РµРґСѓСЋС‰РёР№ verified business candidate вЂ” [`GET()`](../../../apps/web/src/app/api/eps/approvals/route.ts:12)
СЃ `cx 29` / 159 СЃС‚СЂРѕРєР°РјРё. Bounded-РїРѕРґРёСЃС‚РѕСЂРёСЏ СЃРѕР·РґР°РЅР° РІ
[`K4.7-eps-approvals-get-query.md`](K4.7-eps-approvals-get-query.md): РІ С‚РµРєСѓС‰РµРј
stage РІС‹РЅРµСЃРµРЅС‹ С‚РѕР»СЊРєРѕ pure query parsing/filter/stat construction, РґРѕР±Р°РІР»РµРЅС‹
focused tests Рё СЃРѕС…СЂР°РЅРµРЅС‹ GET/POST route contracts. Targeted tests, full tests,
web lint, web tsc, quality baseline Рё docs link check Р·РµР»С‘РЅС‹Рµ; stage Р·Р°РєСЂС‹С‚Р°
РєРѕРјРјРёС‚РѕРј `7615f8e`.

Р’РѕСЃСЊРјРѕРµ РёР·РјРµСЂРµРЅРёРµ 2026-08-30: РїРѕСЃР»Рµ Р·Р°РєСЂС‹С‚РёСЏ K4.7 С‡РёСЃР»РѕРІРѕР№ РјР°РєСЃРёРјСѓРј checker вЂ”
`WmsOperationWizardDialog` СЃ `cx 42`, РЅРѕ СЌС‚Рѕ presentation boundary. РЎР»РµРґСѓСЋС‰РёР№
РїСЂРѕРІРµСЂРµРЅРЅС‹Р№ business candidate вЂ” [`GET()`](../../../apps/web/src/app/api/eps/equipment/route.ts:10)
СЃ `cx 24` / 145 СЃС‚СЂРѕРєР°РјРё: query parsing, Prisma filter, status aggregation Рё
response mapping РЅР°С…РѕРґСЏС‚СЃСЏ РІ РѕРґРЅРѕРј route handler. Р”Р»СЏ СЃР»РµРґСѓСЋС‰РµР№ bounded stage
РІС‹Р±СЂР°РЅ С‚РѕР»СЊРєРѕ GET equipment query/status construction; POST, UI Рё РїСЂРѕС‡РёРµ K4
candidates РЅРµ РІС…РѕРґСЏС‚ РІ scope.

Девятое измерение после K4.10: quality checker подтвердил следующим verified
business candidate [`PATCH()`](../../../apps/web/src/app/api/srm/issues/[id]/route.ts:87)
с `cx 26`. Проверка чтением исходника подтвердила, что complexity сосредоточена в
partial update и derived resolved/downtime model; численно более высокий
`handleOpenDetails` в SRM является трёхстрочным state setter и исключён как
presentation-only false positive.

Для него создана bounded-подистория
[`K4.11-srm-issue-patch-update-model.md`](K4.11-srm-issue-patch-update-model.md):
в текущем stage вынесены только pure update-field/resolution calculations,
добавлены focused tests, а Prisma side effects, RBAC, rate limiting, audit и
response contract остаются в route.

Десятое измерение после закрытия K4.13: verified business candidate
[`buildTransferWhereInput()`](../../../apps/web/src/lib/wms-transfers-service.ts:46)
имел `cx 26` / 73 строки. Для K4.14 выделена только декомпозиция mode/warehouse
scope и search filter в [`wms-transfer-where-model.ts`](../../../apps/web/src/lib/wms-transfer-where-model.ts:1).
Публичный consumer в [`GET()`](../../../apps/web/src/app/api/wms/transfers/route.ts:20),
Prisma where contract и POST не изменялись; focused tests добавлены в
[`wms-transfers.test.ts`](../../../apps/web/src/lib/__tests__/wms-transfers.test.ts:1).
После stage quality checker показывает `buildTransferWhereInput()` `cx 1`,
`buildTransferWhereModel()` `cx 3`, `applyModeScope()` `cx 10`; targeted/full tests,
lint, web tsc, quality baseline и docs link check зелёные. Stage committed as
`92ede6f`; story remains active until its closeout commit.

## K4 parent closeout — 2026-08-30

All bounded K4 stages are complete and indexed: K4.1, K4.1.1, and K4.2–K4.14.
The remaining highest measured functions are not unaddressed K4 business candidates:
`WmsOperationWizardDialog` (`cx 42`) is a presentation/render boundary;
`handleOpenDetails` in SRM (`cx 35`) is a state/presentation boundary; and
`handleRequestSort` in EPS documents (`cx 34`) is a route/page presentation boundary.
No further K4 work is invented from numeric checker output.

Closeout verification from HEAD `ef54669`:

- Quality baseline report passed: `apps/web/src` average `84.2`, 22 F-grade files,
  2347 smells, 24 SOLID violations; `packages` average `94.1`, zero F-grade files,
  74 smells, zero SOLID violations.
- Full test gate passed: 187 tests passed, 0 failed.
- Full lint gate passed: `pnpm lint`.
- Web TypeScript gate passed: `pnpm --filter @ems/web exec tsc --noEmit`.
- Documentation links gate passed: `pnpm check:docs`.
- Plans index regenerated successfully.

The generated quality baseline was updated with the current measured values. K4 is
closed without changing implementation behavior, security, UI, K6, or unrelated work.
