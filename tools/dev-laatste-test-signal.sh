#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/laatste-test"

echo "laatste-test signaling + document API on http://127.0.0.1:8081/"
echo "  signal.php   — WebRTC mesh signaling"
echo "  document.php — shared markdown / yjs snapshot"
echo ""
echo "Use with Storybook: pnpm dev:ui (proxies /laatste-test/* → this server)"
exec php -S 127.0.0.1:8081 -t .
