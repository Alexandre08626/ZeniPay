#!/usr/bin/env bash
#
# Sync the official ZeniPay agent avatars from the Zeniva Travel project.
# The Zeniva Travel repo owns the 1024×1024 PNG visuals and treats them
# as the canonical source; ZeniPay is downstream so we just copy.
#
# Prereqs:
#   * zeniva-travel repo checked out at ~/zeniva-travel
#   * git-lfs installed (`brew install git-lfs && git lfs install`) so
#     the real PNGs are materialized instead of LFS pointer stubs.
#
# Run from the zenipay repo root:
#   ./scripts/sync-agent-avatars.sh
#
# Lina is intentionally excluded — she belongs to Zeniva Travel only.

set -euo pipefail

SRC="${ZENIVA_TRAVEL_PATH:-$HOME/zeniva-travel}/web/public/agents"
DEST="$(cd "$(dirname "$0")/.." && pwd)/public/agents"

if [ ! -d "$SRC" ]; then
  echo "✗ Source not found: $SRC"
  echo "  Set ZENIVA_TRAVEL_PATH or clone to ~/zeniva-travel"
  exit 1
fi

mkdir -p "$DEST"

# Default four + eight templates = 12 total. Nova is intentionally
# excluded (her Zeniva-Travel avatar is stylistically off-brand here).
AGENTS=(ben max jade kai marco sofia atlas luna mia leo rex vera)

for name in "${AGENTS[@]}"; do
  src="$SRC/$name.png"
  dest="$DEST/$name.png"
  if [ ! -f "$src" ]; then
    echo "✗ Missing source: $src"
    exit 1
  fi
  # Guard against LFS pointer stubs (a few hundred bytes of ASCII).
  size=$(wc -c < "$src" | tr -d ' ')
  if [ "$size" -lt 10000 ]; then
    echo "✗ $name.png is an LFS pointer stub at $src"
    echo "  Run: (cd $(dirname $SRC)/.. && git lfs pull)"
    exit 1
  fi
  cp "$src" "$dest"
done

echo "✓ Synced ${#AGENTS[@]} agent avatars to $DEST"
