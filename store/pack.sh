#!/usr/bin/env bash
# Package X History for Chrome Web Store upload.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")"
DIST="$ROOT/dist"
NAME="x-history-${VERSION}"
STAGE="$DIST/${NAME}"

rm -rf "$STAGE"
mkdir -p "$STAGE/icons" "$STAGE/src"

cp manifest.json "$STAGE/"
cp icons/icon16.png icons/icon48.png icons/icon128.png "$STAGE/icons/"
cp src/background.js src/content.js src/content.css src/page-hook.js src/storage.js src/view-stability.js "$STAGE/src/"

# Optional short readme inside package (not required by store)
cat > "$STAGE/README.txt" << EOF
X History v${VERSION}
Chrome / Edge extension — local history for posts you open on X.
EOF

ZIP="$DIST/${NAME}.zip"
rm -f "$ZIP"
(
  cd "$DIST"
  zip -r -q "${NAME}.zip" "${NAME}"
)

echo "Packed: $ZIP"
echo "Size:   $(du -h "$ZIP" | awk '{print $1}')"
echo "Upload this zip in Chrome Web Store developer dashboard."
