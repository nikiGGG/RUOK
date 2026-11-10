# Native PostgreSQL recovery test budget

Corrective Op `01M71V7074RWQY0HAMEF8AQ4WX`; Node Norris implementation support.
This is a test-only amendment after the runtime image was built; the runtime
source/image content remains identical. Root authorized the change after
independent reviewer conditional approval.

The serial PostgreSQL backend gate recorded 92 passing cases and one failure:
the native recovery test exceeded Vitest's default 5,000 ms whole-test timeout.
No application assertion failure was shown. That log does not establish which
phase exceeded its allowance, nor prove a product hang.

The test performs sequential prerequisites (three tool version probes and a live
server check), optional container-tool probes, disposable database creation,
migration, full installation seeding, native dump, database drop/recreation,
native restore, schema/journal verification, typed data assertions and cleanup.
The 5-second test timeout covers that entire workflow, including its finally
cleanup. The explicit application test configuration already permits 10-second
connection/checkout waits and 30-second SQL statement execution. The plan's
5-second HTTP probe requirement does not impose a native recovery SLA.

The original native `execFile` calls and bare administration clients do not have
individual explicit timeout settings; this correction does not claim otherwise
or change them. The prerequisite server connection has its existing 3-second
connection timeout. All tool arguments, database configuration, assertions and
failure handling remain unchanged.

Root ran one [diagnostic](diagnostic.log) against unchanged test source using a
30-second CLI test-timeout allowance. It exited 0 after completing the actual
dump/restore, schema verification and typed-read assertions: test duration
1,230 ms, command duration approximately 4.65 seconds. This establishes that the
workflow can complete correctly; it neither identifies the exact earlier slow
phase nor establishes a deterministic performance regression.

The approved minimal correction supplies only this individual `it` case with a
30,000 ms whole-workflow timeout and a comment explaining the composed budget.
It does not change the global Vitest configuration, retry behavior, command
budgets, application code, assertions, package commands or CI/CD. The prior
5-second failing run remains evidence. Root owns the subsequent ordinary
standalone and full PostgreSQL backend gates with retries disabled, and their
final execution/provenance ledger; those results are not predeclared here.


## Final parent execution (2026-11-10)

Normal package verification completed without CLI timeout overrides: standalone native1/1 and complete PostgreSQL backend93/93 pass with zero mandatory skips. See `standalone.log`, `postgres-backend.log`, and the independent corrective review.
