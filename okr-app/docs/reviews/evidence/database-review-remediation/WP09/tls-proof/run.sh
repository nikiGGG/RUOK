#!/usr/bin/env bash
# Supplemental actual endpoint evidence; no product code, global config or registry mutation.
set -euo pipefail
APP=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)
EVIDENCE="$APP/docs/reviews/evidence/database-review-remediation/WP09/tls-proof"
IMAGE=localhost/ruok:wp08
PG_IMAGE=docker.io/library/postgres:18
test -x "$APP/node_modules/.bin/esbuild" || { echo 'BLOCKED: run integrated exact-lockfile npm ci first' >&2; exit 2; }
PRIVATE=$(mktemp -d /tmp/ruok-wp09-tls-XXXXXX)
SUFFIX=${PRIVATE##*-}
NETWORK="ruok-wp09-tls-$SUFFIX"
SERVER="ruok-wp09-tls-db-$SUFFIX"
cleanup() {
  status=$?
  trap - EXIT
  podman rm -f "$SERVER" >/dev/null 2>&1 || true
  podman network rm "$NETWORK" >/dev/null 2>&1 || true
  rm -rf "$PRIVATE"
  exit "$status"
}
trap cleanup EXIT
export POSTGRES_PASSWORD
POSTGRES_PASSWORD=$(openssl rand -hex 24)
{
  printf 'start=%s\n' "$(date -u +%FT%TZ)"
  printf 'command=bash docs/reviews/evidence/database-review-remediation/WP09/tls-proof/run.sh\n'
  printf 'source_revision=%s\n' "$(git -C "$APP" rev-parse HEAD)"
  printf 'source_dirty_diff_sha256='
  git -C "$APP" diff --binary | sha256sum
  printf 'verifier_image_id='
  podman image inspect --format '{{.Id}}' "$IMAGE"
  printf 'postgres_image_id='
  podman image inspect --format '{{.Id}}' "$PG_IMAGE"
  printf 'image_policy=all runs use --pull=never; no image downloads attempted\n'
  podman --version
  openssl version
  sha256sum "$APP/src/lib/db/config.ts" "$APP/src/lib/db/migrations/postgres-migrator.ts" "$EVIDENCE/live.ts" "$EVIDENCE/run.sh"
} > "$EVIDENCE/provenance.txt"
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$PRIVATE/ca.key" -out "$PRIVATE/ca.crt" -days 1 -subj /CN=RUOK-WP09-Disposable-CA > /dev/null 2>&1
openssl req -newkey rsa:2048 -nodes -keyout "$PRIVATE/server.key" -out "$PRIVATE/server.csr" -subj /CN=tls-match > /dev/null 2>&1
printf 'subjectAltName=DNS:tls-match\n' > "$PRIVATE/san.ext"
openssl x509 -req -in "$PRIVATE/server.csr" -CA "$PRIVATE/ca.crt" -CAkey "$PRIVATE/ca.key" -CAcreateserial -out "$PRIVATE/server.crt" -days 1 -extfile "$PRIVATE/san.ext" > /dev/null 2>&1
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$PRIVATE/foreign-ca.key" -out "$PRIVATE/foreign-ca.crt" -days 1 -subj /CN=RUOK-WP09-Foreign-CA > /dev/null 2>&1
chmod 600 "$PRIVATE/"*.key
openssl x509 -in "$PRIVATE/server.crt" -noout -subject -issuer -dates -fingerprint -sha256 -ext subjectAltName > "$EVIDENCE/server-public-identity.txt"
podman network create "$NETWORK" >/dev/null
podman run -d --pull=never --name "$SERVER" --network "$NETWORK" --network-alias tls-match --network-alias tls-wrong \
  --env POSTGRES_PASSWORD --volume "$PRIVATE:/private-tls:ro" --entrypoint sh "$PG_IMAGE" -ec \
  'cp /private-tls/server.crt /tmp/ruok-server.crt; cp /private-tls/server.key /tmp/ruok-server.key; chown postgres:postgres /tmp/ruok-server.crt /tmp/ruok-server.key; chmod 600 /tmp/ruok-server.key; exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/ruok-server.crt -c ssl_key_file=/tmp/ruok-server.key' > /dev/null
ready=0
for ((attempt=0; attempt<60; attempt++)); do
  if podman exec "$SERVER" pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then echo 'BLOCKED: disposable TLS PostgreSQL not ready within60s' >&2; exit 2; fi
printf 'fixture_ready=%s\n' "$(date -u +%FT%TZ)" >> "$EVIDENCE/provenance.txt"
set +e
podman run --rm --pull=never --user 0 --network "$NETWORK" --env POSTGRES_PASSWORD \
  --volume "$APP:/workspace" --volume "$PRIVATE:/private-tls" --workdir /workspace --entrypoint sh "$IMAGE" -ec \
  'node --version; node -p '\''"pg="+require("pg/package.json").version'\''; node_modules/.bin/esbuild --version; node_modules/.bin/esbuild docs/reviews/evidence/database-review-remediation/WP09/tls-proof/live.ts --bundle --platform=node --format=cjs --external:pg-native --outfile=/private-tls/live.cjs; node /private-tls/live.cjs' > "$EVIDENCE/live.log" 2>&1
status=$?
set -e
printf 'end=%s\nexit=%s\n' "$(date -u +%FT%TZ)" "$status" >> "$EVIDENCE/provenance.txt"
cat "$EVIDENCE/live.log"
if [ "$status" -ne 0 ]; then exit "$status"; fi
grep -q 'SUMMARY: baseline parser reproduced; fixed parser policy passed; all6 live TLS cases passed with no plaintext fallback' "$EVIDENCE/live.log"
printf 'TLS proof passed:6 live cases plus parser baseline/fixed policy\n'
