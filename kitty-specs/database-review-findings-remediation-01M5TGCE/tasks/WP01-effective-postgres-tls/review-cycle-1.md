---
affected_files: []
cycle_number: 1
mission_slug: database-review-findings-remediation-01M5TGCE
reproduction_command:
reviewed_at: '2026-10-27T22:19:12Z'
reviewer_agent: user
wp_id: WP01
---

**Verdict**: REQUEST CHANGES (acceptance criteria not met — live TLS regression evidence is missing/blocked).

**Issue 1 (blocking) — Required live real-TLS evidence (T003/L1) was NOT executed, so FR-001 / FR-008 / NFR-001 are not satisfied.**

The spec and this WP require executed, real PostgreSQL TLS boundary evidence, not just a builder assertion or an on-disk script:
- FR-001: "verify actual trusted/untrusted/hostname behavior" (real TLS tests).
- NFR-001: "Zero closures solely from inspection, builder assertions or scripts existing on disk."
- DRIFT-1 mapping: "real TLS trusted/untrusted CA and hostname tests."
- WP definition of done: "Missing live execution remains incomplete and blocks acceptance" and "Reject if the intended scenario never executes or fixture setup fails before the claimed assertion."

The implementation is correct and honest: `tests/db/tls.test.ts` (T003) exercises the production runtime pool and migration Client against a real TLS `postgres:18` endpoint for trusted-CA success, untrusted-CA rejection, and hostname-mismatch rejection, and the manifest/run-notes correctly record L1 as PENDING/blocked (never PASS). The block is genuine — the local Docker daemon only has `docker-proxy.artifactory.tcsbank.ru/postgres:18`, and `tls-fixtures.ts` uses the short tag `postgres:18`, so running it would require a pull that the mandatory image-download stop rule (C-007) forbids (and substituting the registry-qualified image is also forbidden by C-007). The implementer correctly did NOT substitute or fake it. No violation of C-007 is being asked for.

However, because the acceptance criteria require executed real-TLS outcomes and the scenario never executes, the WP cannot be approved in its current state. Per C-007 this is a blocked check that must remain blocked pending operator direction on image registry. Please:
1. Obtain operator direction to unblock the `postgres:18` image (or authorize a pinned registry-qualified image), then run `RUOK_TEST_LIVE_TLS=1 vitest run tests/db/tls.test.ts` with Docker + openssl available and record the executed T003 results (trusted/untrusted/hostname) in `okr-app/docs/reviews/evidence/database-review-remediation/WP01/` with exit codes, versions, revision and checksums (T004 before/after).
2. Only then can FR-001 / FR-008 / NFR-001 be closed.

**Non-blocking notes (all other acceptance criteria PASS):**
- T001/T002 core change verified locally: `DB_BACKEND=sqlite vitest run tests/db/config.test.ts tests/db/tls.test.ts` → 55 passed / 5 skipped (exit 0). The DRIFT-1 defect is reproduced through the real `pg` parser, and `buildPostgresPoolConfig` sanitizes the URL and applies explicit canonical `ssl` so `rejectUnauthorized` + custom CA survive. Both the runtime pool (`adapters/postgres.ts`) and the migration Client (`postgres-migrator.ts` → `buildPostgresPoolConfig`) share the same builder.
- Anti-pattern checks: no dead code (`sanitizePostgresConnectionString` has a live production caller); tests are not synthetic fixtures (real `pg.Client` constructed); silent-return paths are documented; frozen surface / shared-file ownership respected (only WP01-owned files + evidence dir changed); no `MUST NOT`/C-007 violation; fail-loud rationale for the pre-connect rejections is documented.
- Security posture of the change is sound: unsupported/duplicate/contradictory URL TLS controls are rejected deterministically before connect; `no-verify`/`prefer` are refused; non-security URL params are preserved; no passwords/private keys are committed.