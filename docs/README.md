# Documentation map — EMS-Platform

This index tells you where to look for a fact, not what the fact currently
is. Each row names exactly one location that is the source of truth — if
you find the same number or status duplicated elsewhere, that other copy is
stale by definition and should be replaced with a link.

## "I need to know..."

| I need to know... | Look here |
|---|---|
| What tasks are in progress right now | [`plans/README.md`](../plans/README.md) (generated) |
| What tasks are done and how | [`plans/done/`](../plans/done/) (one file per story) |
| What's queued but not scheduled | [`plans/BACKLOG.md`](../plans/BACKLOG.md) |
| Current code quality score / F-grade count / thresholds | [`docs/quality/QUALITY_BASELINE.md`](quality/QUALITY_BASELINE.md) (generated) |
| Current test coverage (line coverage + file-level охват) | [`docs/quality/COVERAGE_BASELINE.md`](quality/COVERAGE_BASELINE.md) (generated) |
| Current route-level rate-limit/RBAC coverage | [`docs/quality/SECURITY_BASELINE.md`](quality/SECURITY_BASELINE.md) (generated) |
| What a specific past inspection found | [`docs/quality/inspections/`](quality/inspections/) (dated, immutable) |
| Security rules (webhook auth, RBAC, LDAP, rate limiting) | [`.agents/rules/security.md`](../.agents/rules/security.md) |
| UI component / design-system rules | [`.agents/rules/ui_design_code.md`](../.agents/rules/ui_design_code.md) |
| Code quality thresholds and how to run the checker | [`.agents/rules/code_quality.md`](../.agents/rules/code_quality.md) |
| Which skill to use for a task | [`.agents/rules/skills_usage.md`](../.agents/rules/skills_usage.md) |
| Database schema / ERD | [`docs/architecture/DATABASE_TOPOLOGY.md`](architecture/DATABASE_TOPOLOGY.md) |
| Why a significant architectural choice was made | [`docs/architecture/decisions/`](architecture/decisions/) (ADRs, see ADR-0001 for the plans/ + QUALITY_BASELINE.md structure itself) |
| How to deploy to production | [`docs/operations/PRODUCTION_DEPLOYMENT.md`](operations/PRODUCTION_DEPLOYMENT.md) |
| How to deploy air-gapped / bare metal | [`docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md`](operations/BAREMETAL_OFFLINE_DEPLOYMENT.md) |
| How to configure the Jira/SRM integration | [`docs/operations/JIRA_SRM_SETUP.md`](operations/JIRA_SRM_SETUP.md) |
| Full product/technical specification | [`docs/specs/technical_specification.md`](specs/technical_specification.md) |
| Agent entry contract, hard rules, skill routing | [`AGENTS.md`](../AGENTS.md) |
| Available maintenance, deployment, import, and audit scripts | [`scripts/README.md`](../scripts/README.md) |
| Docker-based offline deployment | [`docs/operations/AIRGAP_DOCKER_DEPLOYMENT.md`](operations/AIRGAP_DOCKER_DEPLOYMENT.md) |

## Directory layout

```
docs/
├── README.md                     ← this file
├── REMEDIATION_PLAN.md           ← stub redirect to plans/ (kept for old links)
├── quality/
│   ├── QUALITY_BASELINE.md       ← GENERATED — sole current-metrics source
│   ├── COVERAGE_BASELINE.md      ← GENERATED — test coverage metrics
│   ├── SECURITY_BASELINE.md      ← GENERATED — route rate-limit/RBAC scan
│   └── inspections/              ← dated, immutable point-in-time reports
├── architecture/
│   ├── DATABASE_TOPOLOGY.md, topology_*.mmd, database_topology.html
│   └── decisions/                ← ADRs (architecture decision records)
├── operations/
│   ├── PRODUCTION_DEPLOYMENT.md
│   ├── BAREMETAL_OFFLINE_DEPLOYMENT.md
│   └── JIRA_SRM_SETUP.md
└── specs/
    └── technical_specification.md

plans/                            ← work tracking, NOT under docs/
├── README.md                     ← GENERATED ledger
├── BACKLOG.md
├── active/                       ← one file per open story
└── done/YYYY-MM/                 ← one file per closed story, immutable
```

## Scripts and generated checks

The script catalog is [`scripts/README.md`](../scripts/README.md). It
classifies manual operational tools separately from CI quality/security gates
and records required inputs and mutation risk. Generated documentation is
validated by [`scripts/check-doc-links.mjs`](../scripts/check-doc-links.mjs).

## The one rule that keeps this from rotting again

**No markdown file may hardcode a number or status that a script can
compute or that lives in exactly one other file.** If you're about to type
a quality score, an F-grade count, or "story X is done" — stop and link to
[`docs/quality/QUALITY_BASELINE.md`](quality/QUALITY_BASELINE.md) or
[`plans/README.md`](../plans/README.md) instead. See
[`.agents/rules/skills_usage.md`](../.agents/rules/skills_usage.md) for the
full story lifecycle and reporting discipline.
