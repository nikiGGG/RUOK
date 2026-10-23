---
affected_files: []
cycle_number: 1
mission_slug: sqlite-postgresql-support-01M5JP6Y
reproduction_command: spec-kitty agent tasks move-task WP11 --to approved --mission sqlite-postgresql-support-01M5JP6Y
reviewed_at: '2026-10-23T00:14:33Z'
reviewer_agent: user
wp_id: WP11
---

Approved by user: Review passed: WP11 docs complete/actionable/accurate. T041 DATABASES+SETUP+MAINTENANCE+README document both backends, env precedence, pool limits, PG16/17, WAL/no-NFS, legacy preflight, migrate-only/readiness, no auto backend transfer; production db:push explicitly replaced. T042 unsafe live checkpoint/cp recipes replaced with SQLite backup API/CLI + stopped-writers; PG pg_dump/pg_restore/CNPG described; install-backup vs v2 user-export distinguished with exclusions, four portable directions, restore validation; commands validated on disposable SQLite (migrate/verify/.backup/restore all exit 0, outputs match docs verbatim). T043 CNPG-HANDOFF actionable with all inputs listed MISSING (no fabricated values); PR-11 context only; probes, one replica, migration-Job ordering, PG volume removal, HTTPS, backup-recovery validation. T044 rollout walks clean SQLite+PG, native recovery, rollback-to-prior-image/backup, writes-after-cutover + revert limits; external deployment + wider usability/privacy marked PENDING; task 115 NOT falsely complete. Frozen surface clean (no migration files). Tests 133/133 exit 0 (1 flake in concurrency.test.ts on first run, passed on re-run; docs-only so not a regression); build exit 0. Anti-pattern: PASS/N-A, no FAIL. Live PG/CNPG not run (CI-only/PENDING per docs).
