# PostgreSQL HTTP cycle execution manifest

Status: PASS, complete live cycle; preserved first attempt remains explicitly
incomplete. No product or existing test source was changed to obtain this
result. The successful harness differs only in observing the intended idle
fault before issuing a readiness checkout.

## Exact execution

```bash
podman exec ruok-wp09-verify sh docs/reviews/evidence/database-review-remediation/WP09/postgres-probe-proof/run.sh
```

The parent ran this command visibly against the retained Node22 verifier.
The `cycle` stage ran from2026-11-09T19:29:43.352Z until
2026-11-09T19:29:51.199Z, exit 0, signal null. The shell provenance bounds are
19:29:42Z–19:29:51Z. Exact per-request UTC/monotonic records are in `cycle.log`.

| Required behavior | Actual evidence |
| --- | --- |
| Startup storage unavailable | Unique DB absent; `verify` runtime PID 8108; health 200 in 9.1 ms, ready 503/ready:false in 21.4 ms |
| Separate schema initialization | Admin creates unique DB; actual image-built migration CLI exits0 in 208.1 ms with ready classification |
| First recovery≤30s | Readiness503 then200 in 1021.5 ms; unchanged PID 8108 and increased uptime |
| Real authenticated persistence | Register 200, create 201; exact ID `fb911832-0e11-4f06-a6d4-cf59269d93c4` and generated title checked before outage |
| Real later idle fault | One app backend confirmed idle; new DB connections disabled and that backend terminated |
| Actual idle-error handler | Production marker count 0→1, delta 1, event wait 2.3 ms,child exitCode null |
| Outage detection≤10s | Ready 503 in 16.6 ms after marker observation; whole fault injection/observation/detection about 26 ms, original fault-anchored 10 s assertion passed |
| Liveness during outage | Health200 in 2.5 ms; PID 8108 alive,uptime 4.627401413 s |
| Second recovery≤30s | After connections re-enabled, readiness 200 in 14.1 ms; same child PID and increased uptime |
| No data loss | Exact original ID/title present after recovery using the original authenticated jar; no recreation |
| Request bound≤5s including body | Every proof HTTP request has5 s Abort+duration assertion; largest probe 21.4 ms, largest ordinary request 1554.4 ms |
| Cleanup | Built process stopped; only unique DB restored/terminated/dropped; absence verified; cleanup_failures=[] |

## Source and environment identity

The retained verifier uses Node 22.23.4, pg 8.23.1 and esbuild 0.27.2. Its base
image and real PostgreSQL 18.6 environment are recorded in the parent WP09
`provenance.txt` and environment artifacts. This proof executes the mounted
current workspace build, not the base image's embedded application.

The initial integrated-run revision is
`b70d064becea4f23d40d6557041fb7ca9f1867a6`; it is labelled as such because
the verified current sources include the later owned PostgreSQL close repair.
The exact executed product/build input hashes in `provenance.txt` pin that
state independently of the initial revision:

- Current PostgreSQL adapter:
  `5fd77a1e4c464294f23604828dc12ff560e87e559d9f09cb23b6ae61df0c4234`.
- Current lifecycle:
  `1e298622900729feea7a71368c0dde63aa3b27f54c347694e21194a3d491b661`.
- Unmodified real HTTP fixture:
  `7a63bf90d4f3eec2bb017e8585c2b768e1de52beef97f0c384dcaa3ebf87ef78`.
- Full workspace build-file manifest fingerprint:
  `c8d2998d4583008ed80ad650723ba6cade7ecde0e32c3e39dfedede7d535b381`.
- Separate actual image-built migration CLI:
  `791689702a89fc164deadc0fa421c321ebebb3c73a042b2eec69ead3e39a1f6b`.

Those product,fixture,build and migration-CLI fingerprints are identical
between `attempt1/provenance.txt` and the successful `provenance.txt`.
The second execution changed the evidence harness's observation order,
not the application, backend or acceptance assertions.

## Failed-attempt interpretation

The original 19:26:49.087Z–19:26:55.383Z execution exited 1 on the strict
idle-marker assertion and stopped before second recovery. Its complete
source/transcript/provenance/stage record is retained in `attempt1/`.
It is not counted as a complete passing scenario or relabelled a product bug.
The local installed pg-pool source explains the fixture race: immediate
readiness checkout removes the idle listener before the termination error
arrives. The revised harness requires a newly observed production marker
within 1 s before any readiness checkout, preserving the strict marker check
and counting the wait inside the original 10 s fault budget.

Generated DB credentials and session cookies remain memory-only and never
enter evidence. Child output is retained only privately in memory to count
the known idle-error marker. Persisted stage output passes through the WP09
redactor. `secret-scan.txt` records the safe output scan; `SHA256SUMS` covers
all evidence files, including the preserved attempt1 snapshot.
