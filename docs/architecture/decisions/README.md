# Architecture Decision Records (ADR)

This directory is for ADRs — short documents recording a significant
architectural decision, its context, and its consequences. It is currently
empty; no formal ADRs have been written yet for EMS-Platform.

## When to write one

Write an ADR when a decision is hard to reverse and not obvious from reading
the code — e.g. choice of monorepo tool, auth strategy (JWT + LDAP), why
Prisma over raw SQL, why a specific SRM adapter architecture. Do not write
one for routine refactors — those belong in [`plans/`](../../../plans/).

## Suggested format

```markdown
# ADR-0001: Title

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-000N
**Date:** YYYY-MM-DD

## Context

What forces are at play, what problem are we solving.

## Decision

What we decided to do.

## Consequences

What becomes easier or harder as a result.
```

Name files `NNNN-short-title.md` (e.g. `0001-use-prisma-orm.md`), numbered
sequentially.
