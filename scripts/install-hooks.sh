#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
git -C "$root" config --local core.hooksPath scripts/hooks

for hook in "$root"/scripts/hooks/*; do
  chmod +x "$hook"
done

echo "configured repo-local hooksPath=scripts/hooks"
