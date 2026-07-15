#!/bin/sh
# Packages dist/nautaconnect-chrome.zip and dist/nautaconnect-firefox.zip.
set -eu

cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

copy_common() {
    cp -R src _locales icons "$1/"
}

# Chrome build: manifest.json as-is.
mkdir -p "$STAGE/chrome"
copy_common "$STAGE/chrome"
cp manifest.json "$STAGE/chrome/manifest.json"
(cd "$STAGE/chrome" && zip -qr "$OLDPWD/dist/nautaconnect-chrome.zip" .)

# Firefox build: manifest.firefox.json becomes manifest.json.
mkdir -p "$STAGE/firefox"
copy_common "$STAGE/firefox"
cp manifest.firefox.json "$STAGE/firefox/manifest.json"
(cd "$STAGE/firefox" && zip -qr "$OLDPWD/dist/nautaconnect-firefox.zip" .)

echo "Built:"
ls -la dist/
