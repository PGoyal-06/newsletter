# Data contract (packages/contract)

## Overview

The one shared definition of the data the worker produces and the web app reads. Source only: `exports` points at `src/index.ts`, esbuild inlines it into the worker and Next transpiles it.

## Conventions

- No runtime dependencies and no Node, browser, or Apps Script APIs; it must run in all three places.
- Bump `CONTRACT_VERSION` on any breaking shape change; the web app uses it to discard old caches.
- Shapes (snapshot, error envelope, category map, script settings) are decided in spec 0002.
- `fixtures/today.json` is the one shared snapshot fixture; contract, worker, and web tests all import it, so change it here rather than copying it.
- Runtime checks live in `src/validation.ts` and key normalization (List-Id, sender email) in `src/normalization.ts`, both re-exported from `src/index.ts`.

## Related specs

- [0001 stack & architecture](../../docs/specs/0001-stack-architecture/index.md)
- [0002 data contract](../../docs/specs/0002-data-contract.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
