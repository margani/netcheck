#!/usr/bin/env bash
# Deploy command of the Workers Builds triggers. Usage: bash scripts/deploy.sh [sandbox]
# Writes public/version.json so a deploy can be checked live: /version.json must
# name the commit that was just merged.
set -euo pipefail
: "${WORKERS_CI_COMMIT_SHA?run this from Cloudflare Workers Builds, not by hand}"
# Not WORKERS_CI_COMMIT_SHA itself: on a manual build it holds the branch name
# (tools#1 hit this), so ask git for the real commit.
commit=$(git rev-parse HEAD)
version=$(node -p 'require("./package.json").version')
printf '{"version":"%s","commit":"%s"}\n' "$version" "$commit" > public/version.json
if [ "${1:-}" = "sandbox" ]; then
	npx --yes wrangler@4.150.0 deploy --env sandbox
else
	npx --yes wrangler@4.150.0 deploy
fi
