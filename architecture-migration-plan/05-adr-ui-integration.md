# ADR-0002: UI Microfrontends Integration Architecture

## Status
Accepted

## Context
EMS Platform is migrating from a monolithic Next.js repository to a microkernel shell architecture with independent business modules (`module-eps`, `module-wms`, `module-mro`, `module-prm`) and core extensions.
Requirements mandate that:
1. Each business module is developed in its own independent repository.
2. Module development must not cross paths with or require editing the Shell repository.
3. The Shell UI must dynamically mount routes and navigation items declared in module manifests.

### The Problem with Monolithic Next.js App Router
Next.js App Router relies on filesystem-based static route resolution and compile-time bundling. It cannot dynamically mount arbitrary external React pages from remote module repositories at runtime without triggering a full rebuild of the host application.

---

## Decision: Vite Host Shell + Module Federation with Distribution Assembly

We adopt a two-tier frontend integration model tailored for an enterprise system of ~50 users:

### 1. Primary Model: Module Federation (Runtime Decoupling)
* **Shell (`platform-shell`):** Hosts the application root, authentication state, theme provider, top app bar, and dynamic sidebar navigation.
* **Modules (`module-*`):** Each module exposes an entrypoint React component (e.g. `EpsRootPage`, `WmsRootPage`) as a remote container via Module Federation (Vite/Rollup `@originjs/vite-plugin-federation`).
* **Route Mounting:** The Shell reads `module.manifest.json` from the module registry API, loads the remote entrypoint dynamically using standard ES dynamic imports, and mounts it into the designated `<ModuleSlot />`.

### 2. UI Manifest Contract (`module.manifest.json`)
```json
{
  "id": "module-wms",
  "version": "1.0.0",
  "ui": {
    "remoteEntry": "/modules/wms/remoteEntry.js",
    "exposedComponent": "./WmsApp",
    "basePath": "/wms",
    "navigation": [
      {
        "id": "wms-root",
        "title": "Warehouse Management",
        "path": "/wms",
        "icon": "WarehouseIcon",
        "permission": "wms:stock:read"
      }
    ]
  }
}
```

### 3. Fallback / Distribution Assembly (`platform-distribution`)
For offline / air-gapped enterprise deployments without remote CDN dependencies:
* `platform-distribution` includes an assembly build step that installs all active module npm packages into the Shell and compiles a single optimized static bundle served by Nginx.

---

## Consequences

### Positive
- Modules can be developed, tested, and updated completely independently.
- UI components stay encapsulated within their respective domain repositories.
- Zero coupling between module UI components (WMS never imports EPS React components).

### Negative / Trade-offs
- Shared dependencies (React, Emotion, MUI) must be configured as singletons in Module Federation config to avoid duplicate React runtime instances.
- UI components themselves remain exempt from unit testing (per project governance), but data transformation and state reducers must be tested via TDD.
