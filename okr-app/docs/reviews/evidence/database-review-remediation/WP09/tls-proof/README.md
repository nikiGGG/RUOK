# Supplemental WP09 live TLS evidence

This replay supplements the narrative-only historical WP01 execution record.
It does not rewrite the earlier owner's artifacts or claim that their missing
raw logs were recovered. Execution is complete only when `provenance.txt`
records exit 0 and `live.log` contains the six-case success summary.

## Executed result

The parent executed the exact replay on 2026-11-09 from 04:45:59Z to
04:46:10Z: exit 0, all six endpoint cases passed. The runtime Pool and actual
migration Client both returned `SELECT 1 = 1` with server-side TLS enabled.
Both rejected the foreign CA with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, and
both rejected the wrong hostname with `ERR_TLS_CERT_ALTNAME_INVALID`.
The raw-parser downgrade/CA-loss controls reproduced the defect and the
current product policy retained verification/CA and rejected a downgrade URL.

The source revision was `b70d064becea4f23d40d6557041fb7ca9f1867a6`.
The verifier image was local ID
`51c54a4ee944c18485d06576c008b00cbb7e82b85bf3c1ca6465085b3971c7a9`;
the PostgreSQL image was local ID
`8bca9649e52d948114ccc8164b55b7ab26b64e729893e420114bb5c87bf7c7cc`.
The live server reported PostgreSQL18.6, with Node22.23.4, pg8.23.1,
esbuild0.27.2, Podman6.1.4 and host OpenSSL3.6.5. Exact input hashes and
UTC bounds appear in `provenance.txt`; artifact hashes are in `SHA256SUMS`.

The pg-connection-string warning in `live.log` comes from the deliberately
unsafe raw-parser baseline controls. The fixed connection configurations
consume the TLS URL hint before pg parses the URL; the test does not apply
the compatibility flag suggested by that warning.

Run from `okr-app/` after the integrated runner has installed the committed
lockfile dependencies:

```bash
bash docs/reviews/evidence/database-review-remediation/WP09/tls-proof/run.sh
```

The command creates an isolated Podman network and one disposable PostgreSQL18
TLS server, then executes the Node22 verifier from the already-built
`localhost/ruok:wp08` image. Both images use `--pull=never`; the exact local
image IDs are recorded in `provenance.txt`, not represented as registry digests.
The PostgreSQL password, generated CA/server private keys and compiled proof
bundle exist only in a private temporary directory and are deleted on exit.
The container/network are cleaned up on both success and failure. No global
container, registry, TLS or application configuration is changed.

`live.ts` directly imports the production `loadConfig` and
`buildPostgresPoolConfig` from `src/lib/db/config.ts`, and the actual
`createPostgresMigrationClient` from
`src/lib/db/migrations/postgres-migrator.ts`. It adds no substitute TLS builder.
The temporary CommonJS bundle includes those implementations and the installed
pg package; the product source and proof script hashes are recorded separately.

The controlled matching endpoint certificate has SAN `DNS:tls-match`.
The same server is also reachable as `tls-wrong`, deliberately absent from the
certificate SAN. A separately generated foreign CA provides the untrusted
certificate control. For each production connection path the proof requires:

| Case | Required result |
| --- | --- |
| Trusted CA and matching hostname | `SELECT 1 = 1` and server-side `pg_stat_ssl.ssl = true` |
| Foreign CA | A certificate trust rejection, not a transport/fixture failure |
| Hostname `tls-wrong` | A certificate hostname rejection, not a transport/fixture failure |

The verifier also reproduces the original vulnerability through the installed
real pg parser: URL `sslmode=no-verify` overrides explicit verification and URL
`sslmode=require` discards an explicit CA. It then requires the current product
builder to preserve verification/CA, consume the TLS URL control, retain an
unrelated URL parameter, and reject the downgrade URL before connecting.
Raw-parser controls are explicitly labelled baseline reproductions; they are
not represented as an execution of the historical application revision.

`server-public-identity.txt` records only public certificate identity, SAN,
validity and fingerprint. `live.log` records controlled case results and
allow-listed rejection codes, never credentials or connection strings.
`provenance.txt` records UTC bounds, exit status, exact source revision,
dirty diff hash, image IDs, tool versions and input hashes.
