#!/bin/bash
# Deploys the portfolio to Cloudflare Pages (project nikhilkapadia).
# The Pages project is not connected to Git, so pushing never deploys.
# This is the only way the site updates.
set -euo pipefail
cd "$(dirname "$0")"

# dist is the upload set: the static files, nothing else. functions/ is
# picked up automatically from the repo root by wrangler.
mkdir -p dist
for f in index.html logo.svg og.png apple-touch-icon.png ghchart.svg Nikhil_Kapadia_Resume.pdf; do
    command cp -f "$f" dist/
done

npx --yes wrangler@4 pages deploy dist \
    --project-name nikhilkapadia \
    --branch main \
    --commit-dirty=false
