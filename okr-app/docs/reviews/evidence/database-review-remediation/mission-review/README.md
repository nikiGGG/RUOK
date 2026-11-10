# Independent initial mission-review reproductions

These artifacts establish three failures on merged target HEAD
`10b7bd4f2b0839ebba3dcea65044090519ab61c5`. They precede corrective implementation.
The reviewer authored only review/evidence artifacts. The parent orchestrator
executed the focused proofs with authorized Podman access.

- `verify-mode.sh` is the exact executed wrapper; `verify-mode.log` captures its
  output (2026-11-10T04:23:03Z–04:23:07Z, wrapper exit 0). It starts immutable
  local image ID `76851d5c343ef90ab57a6313db88d73a341e0f53c7380d6052f7cfd87d1fb06d`
  with `MIGRATION_MODE=verify`, a fresh temporary bind volume and user 0 so
  permissions cannot mask unintended creation. Health is requested before
  readiness. The file is initially absent, readiness changes 503→200 and
  inspection finds all 26 tables. Initial curl connection-reset messages occur
  during bounded health startup polling; health subsequently succeeds. The
  wrapper removes its disposable container/directory on exit.
- `schema-boundaries.ts` is the independent real SQLite reproduction. The
  orchestrator bundled it in the final Node 22 image with the exact-lock
  development modules and actual target checkout mounted, then executed the
  resulting ESM file. `schema-boundaries.log` records Node 22.23.4 and the actual
  start timestamp 2026-11-10T04:21:53.743Z. Execution exited 0. Added UNIQUE and FK
  constraints are accepted by migrate and verify yet reject valid writes. A
  journal-only database containing an unknown row is classified fresh and
  mutated. Fixtures for the constraint cases use the unchanged checked migration
  history; the journal case uses a real file with only the corrupt journal.

The schema payload was executed from `/workspace/okr-app`:

```sh
node_modules/.bin/esbuild docs/reviews/evidence/database-review-remediation/mission-review/schema-boundaries.ts --bundle --platform=node --format=esm --packages=external --outfile=node_modules/.cache/review-schema.mjs
node node_modules/.cache/review-schema.mjs
```

ESM preserves `createRequire(import.meta.url)` in the production reference-layout
builder. No production source/test mutation is needed to reproduce these failures.
The harness deliberately completes with exit 0 after recording unexpected
acceptance/mutation: its JSON behavioral observations are the failing contract
oracles. These exits must not be misreported as contract PASS.

The final image/source identity and exact dependency versions are independently
bound by `../WP09/final-image/provenance.txt`, its source manifest, and
`../WP09/postmerge/provenance.txt`. The actual-target postmerge build and full
173-test suite passed before these focused reproductions; those broad tests
therefore miss the identified boundaries.

`provenance.json` distinguishes executor confirmation from locally inspected
artifacts. `SHA256SUMS` covers this initial audit evidence, excluding itself.
The initial audit report is `../../../database-review-findings-remediation-mission-review.md`.
