# Scoped integration timeout repair

Recorded 2026-11-09T04:49:29Z against lane-i source revision
`b70d064becea4f23d40d6557041fb7ca9f1867a6` plus the uncommitted repair below.

## Ownership coordination

WP09's integrated `npm test` run failed two default five-second Vitest aggregate
deadlines. The orchestrating parent explicitly coordinated this narrow repair to
WP05's `tests/db/no-init.test.ts` and WP06's
`tests/application/probes.suite.ts` before edits. WP09 owns this supplemental
record. Earlier owner evidence, application sources, test configuration and CI/CD
are unchanged. The original failed full-suite transcript remains in `../full.log`.

## Cause and bounded change

The no-init test previously put one esbuild operation and ten serial Node
processes inside a single default five-second test deadline. Its next single
process test took 1,621 ms during the failing integrated run. The old subprocess
helper had no timeout and discarded stderr, so that aggregate timeout did not
establish which process failed or cancel the outstanding subprocess reliably.

Each child now has an explicit 5,000 ms timeout with SIGKILL, captured stdout,
stderr, exit code, signal and monotonic elapsed time. Successful exits must also
complete within 5,000 ms. The aggregate test allows
`(1 build + 10 probes) * 5,000 + 5,000 = 60,000 ms`; the second single-probe test
allows 5,000 ms plus 1,000 ms orchestration overhead. All ten consecutive probes
and their exact unopened-state assertions remain. No retries were added.

The two composed HTTP probe tests previously put server startup, two responses
and teardown under the same five-second aggregate deadline, although the
existing fixture permits 20,000 ms startup and 3,000 ms teardown. Their aggregate
budget is now `20,000 + 2 * 5,000 + 3,000 + 2,000 = 35,000 ms`. Each health and
readiness response separately uses a 5,000 ms abort deadline and a monotonic
`elapsed < 5,000` assertion including JSON body consumption. Startup, individual
requests and shutdown print separate phase durations, including exceptional
completion. Existing status/body checks remain. Fixture deadlines and the
5/10/30-second runtime acceptance bounds are unchanged.

This corrects test composition and tightens child/request cancellation. It does
not establish that the application is free of timing defects: the focused and
integrated reruns must demonstrate the actual phase timings and pass all existing
oracles. A request exceeding five seconds or a failed probe still fails.

## Static verification

The following compiler check exited 0. It only checked TypeScript and did not
execute application code or native SQLite modules under the host Node runtime:

```sh
node node_modules/typescript/bin/tsc --noEmit --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --types node tests/db/no-init.test.ts tests/application/probes.suite.ts
git diff --check -- tests/db/no-init.test.ts tests/application/probes.suite.ts
```

The whitespace check also exited 0. Live/focused validation is pending the
parent's existing Node 22 verifier and is not claimed by this note.

## Source identity before live validation

SHA-256:

```text
50a889eb155650f2a794e4cdd26f17a4c11fcbcb9cf90d7d54d337458b6179c9  tests/db/no-init.test.ts
6e6c3d163f6db16cf9514cd28b0b901e89d71d549f2d6af57d9fbe05b74f059d  tests/application/probes.suite.ts
68bcdc869aeb77efdfc1b25f2304ca94550a5ef1ea3aebcddd7bab854dc21ad4  git diff -- tests/db/no-init.test.ts tests/application/probes.suite.ts
```

## Required runtime verification

Use the prepared Node 22 / PostgreSQL 18 verifier. Run no-init with retries
disabled, both backend application suites, then the mandatory full suite once
after this change. Retain the original failed transcript and the new phase
diagnostics; do not retry a failed assertion into green.
