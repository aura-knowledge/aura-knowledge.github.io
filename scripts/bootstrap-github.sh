#!/usr/bin/env bash
set -euo pipefail

OWNER="${OWNER:-v-i-s-h-a-l}"
REPO="${REPO:-knowledge}"
FEATURE_BRANCH="${FEATURE_BRANCH:-feature/knowledge-garden-foundation}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
REMOTE_URL="${REMOTE_URL:-https://github.com/${OWNER}/${REPO}.git}"
FULL_NAME="${OWNER}/${REPO}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required. Install gh, then rerun this script." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run:" >&2
  echo "  GH_CONFIG_DIR=\${GH_CONFIG_DIR:-$HOME/.config/gh-personal} gh auth login -h github.com" >&2
  exit 1
fi

gh auth setup-git >/dev/null

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if ! git show-ref --verify --quiet "refs/heads/${DEFAULT_BRANCH}"; then
  echo "Missing local ${DEFAULT_BRANCH} branch." >&2
  exit 1
fi

if ! git show-ref --verify --quiet "refs/heads/${FEATURE_BRANCH}"; then
  echo "Missing local ${FEATURE_BRANCH} branch." >&2
  exit 1
fi

if ! gh repo view "$FULL_NAME" >/dev/null 2>&1; then
  gh repo create "$FULL_NAME" \
    --public \
    --description "AI-era knowledge garden with human-readable essays and agent-auditable research packets"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

git push -u origin "$DEFAULT_BRANCH"
git push -u origin "$FEATURE_BRANCH"

if ! gh pr view "$FEATURE_BRANCH" --repo "$FULL_NAME" >/dev/null 2>&1; then
  body_file="$(mktemp)"
  cat >"$body_file" <<'BODY'
## Summary

Creates the first version of the AI-native knowledge garden:

- Astro GitHub Pages site under `/knowledge/`
- first article on agent-auditable research
- agent-readable article and roadmap packets
- generated `llms.txt`, graph files, JSON/JSONL discovery feeds
- roadmap research from `Shubhamsaboo/awesome-llm-apps`
- CI, deploy workflow, local hooks, and publishing governance docs

## Validation

- `npm run check`
- `npm audit --audit-level=moderate`
- Playwright smoke checks for article, roadmap, agents, and mobile overflow
BODY

  gh pr create \
    --repo "$FULL_NAME" \
    --base "$DEFAULT_BRANCH" \
    --head "$FEATURE_BRANCH" \
    --draft \
    --title "[codex] create AI-native knowledge garden" \
    --body-file "$body_file"
fi

echo "Bootstrap complete for ${FULL_NAME}."
