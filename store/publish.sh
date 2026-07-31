#!/usr/bin/env bash
# Pack + upload (+ optional publish) to Chrome Web Store.
# Requires: node/npx, and .env from store/env.example
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

UPLOAD_ONLY=0
PUBLISH_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --upload-only) UPLOAD_ONLY=1 ;;
    --publish-only) PUBLISH_ONLY=1 ;;
    -h|--help)
      echo "Usage: ./store/publish.sh [--upload-only|--publish-only]"
      exit 0
      ;;
  esac
done

# Load .env if present
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

need() {
  local n="$1"
  if [[ -z "${!n:-}" ]]; then
    echo "Missing env: $n"
    echo "Copy store/env.example → .env and fill values. See store/AUTOMATE.md"
    exit 1
  fi
}

need EXTENSION_ID
need CLIENT_ID
need CLIENT_SECRET
need REFRESH_TOKEN

VERSION="$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")"
ZIP="$ROOT/dist/x-history-${VERSION}.zip"
AUTO_PUBLISH="${AUTO_PUBLISH:-1}"

run_cli() {
  npx --yes chrome-webstore-upload-cli@3 "$@" \
    --extension-id "$EXTENSION_ID" \
    --client-id "$CLIENT_ID" \
    --client-secret "$CLIENT_SECRET" \
    --refresh-token "$REFRESH_TOKEN"
}

if [[ "$PUBLISH_ONLY" -eq 1 ]]; then
  echo "→ Publishing existing upload for $EXTENSION_ID …"
  run_cli publish
  echo "Done (submitted for review)."
  exit 0
fi

if [[ "$UPLOAD_ONLY" -eq 0 ]]; then
  echo "→ Packing v${VERSION} …"
  "$ROOT/store/pack.sh"
else
  if [[ ! -f "$ZIP" ]]; then
    echo "Zip not found: $ZIP — run ./store/pack.sh first"
    exit 1
  fi
fi

if [[ ! -f "$ZIP" ]]; then
  echo "Zip missing after pack: $ZIP"
  exit 1
fi

echo "→ Uploading $ZIP …"
run_cli upload --source "$ZIP"

if [[ "$UPLOAD_ONLY" -eq 1 ]]; then
  echo "Upload finished (not published). Set AUTO_PUBLISH=1 or run: ./store/publish.sh --publish-only"
  exit 0
fi

if [[ "$AUTO_PUBLISH" == "1" ]]; then
  echo "→ Submitting for review (publish) …"
  run_cli publish
  echo "Done. Check Chrome Web Store dashboard for review status."
else
  echo "Upload finished. AUTO_PUBLISH is not 1 — skipped publish."
  echo "Submit later: ./store/publish.sh --publish-only"
fi
