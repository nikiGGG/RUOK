# Implementation and validation entrypoint

This is a planning artifact. Commands below describe the planned acceptance workflow, not functionality already shipped by RUOK.

## Start implementation

Mission: `sqlite-postgresql-support-01M5JP6Y`. Begin with WP01 using the Spec Kitty implementation workflow. All 44 subtasks are currently planned. Read research/plan and the selected WP prompt before editing the app. Do not run a full mission loop just to inspect this plan: it may advance work beyond planning.

## Planned development checks

WP01 adds the exact test scripts and lockfile. Every implementation package records `npm ci`, `npm run check`, relevant backend test commands and, when applicable, `npm run build`. A disposable PostgreSQL service is required; never point tests at the existing CNPG application database. Both real backends must pass.

SQLite acceptance: omit DATABASE_TYPE, set a temporary DATABASE_PATH, migrate, start the production app, register two accounts, create annual/monthly goals and daily tasks, exercise progress/privacy, restart and verify persistence. Repeat using recognized legacy SQLite fixtures.

PostgreSQL acceptance: DATABASE_TYPE=postgres with a disposable DATABASE_URL and explicit verified TLS policy for production; migrate before ready, use the same feature fixtures, restart and verify persistence. Verify that no SQLite path is created and that the image can run without a writable data directory. Test invalid credentials/migration failure and readiness.

Backup acceptance: export/restore each of SQLite→SQLite, SQLite→PostgreSQL, PostgreSQL→SQLite and PostgreSQL→PostgreSQL. Compare every supported field/reference and verify rollback after deletes plus late insert failure. Separately rehearse native full-installation restore on each engine.

Container/release acceptance: clean database-free image build; both production startup paths and migration command; PR build-only workflow; trusted release publication and pull-by-digest when execution is authorized and registry inputs exist. External deployment is a separate follow-up to PR 11, using docs/CNPG-HANDOFF.md produced by WP11.

## Branch placement

Planning and subsequent single-branch mission execution target `plan/sqlite-postgresql-support`. Integration into main is a later reviewed PR/merge; do not commit task bookkeeping directly to protected main. No application implementation or PR publication was performed during planning.
