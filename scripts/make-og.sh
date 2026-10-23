#!/bin/sh
# Regenerates app/public/og/*.png from the cover-art code (needs Google Chrome).
set -e
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
npx esbuild scripts/og-entry.ts --bundle --format=iife --outfile="$TMP/og.js" --log-level=warning
printf '<!doctype html><body style="margin:0"><canvas width="1200" height="630"></canvas><script src="og.js"></script>' > "$TMP/og.html"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for c in mountain city dinner mahjong ocean snow forest gradient; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=1200,630 \
    --virtual-time-budget=1500 --screenshot="app/public/og/$c.png" "file://$TMP/og.html#$c" >/dev/null 2>&1
done
rm -rf "$TMP"
ls -la app/public/og
