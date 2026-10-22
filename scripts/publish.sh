#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
npm test
if [[ -n $(git status --porcelain -- site/) ]]; then
  echo 'Commit the rebuilt site before publishing.' >&2
  exit 1
fi
# A normal fast-forward Pages branch containing only static files.
parent=()
if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  parent=(-p "$(git rev-parse refs/remotes/origin/gh-pages)")
fi
tree=$(git ls-tree HEAD site | awk '{print $3}')
commit=$(printf 'Publish site from %s\n' "$(git rev-parse --short HEAD)" | git commit-tree "$tree" "${parent[@]}")
git push origin "$commit:refs/heads/gh-pages"
