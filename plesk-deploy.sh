#!/usr/bin/env bash
set -euo pipefail

# Add common Plesk Node.js binary paths (sorted newest first)
for dir in $(ls -d /opt/plesk/node/*/bin 2>/dev/null | sort -Vr) /usr/local/bin /usr/bin "$HOME/.nvm/versions/node"/*/bin; do
  if [ -x "$dir/node" ] && [ -x "$dir/npm" ]; then
    export PATH="$dir:$PATH"
    break
  fi
done

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: Node.js / npm not found on this Plesk server."
  echo "Please enable Node.js in Plesk or connect Plesk Git to the 'plesk-deploy' branch instead."
  exit 1
fi

echo "Using Node $(node -v) and npm $(npm -v)"
npm install --no-audit --no-fund
npm run build

if [ ! -f "dist/index.html" ]; then
  echo "ERROR: Build failed — dist/index.html not found."
  exit 1
fi

echo "Plesk build completed successfully: dist/index.html is ready."
