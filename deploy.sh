#!/bin/bash
# ─────────────────────────────────────────────────────────
# 190align.com — Deploy via SSH git-sync
#
# The live site serves from a git checkout on the 20i server:
#   /home/virtual/vps-7c189f/3/35236011d5/190align-website
#
# Deploy = push to GitHub, then SSH in and hard-sync the docroot
# to origin/main. (The old SFTP method uploaded to a dead
# public_html the live site never reads — do NOT revive it.)
#
# Usage:  ./deploy.sh            push current commit(s) + deploy
#         ./deploy.sh --no-push  deploy whatever is already on origin/main
# ─────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ───────────────────────────────────────────────
SSH_KEY="$HOME/.ssh/190align_20i"
SSH_HOST="ssh.lhr.stackcp.com"
SSH_PORT="39355"
SSH_USER="190align.com"
DOCROOT="/home/virtual/vps-7c189f/3/35236011d5/190align-website"
BRANCH="main"

# Colours
GREEN='\033[0;32m'; ORANGE='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${ORANGE}▶ 190align deploy — SSH git-sync to live docroot${NC}"

# ── 1. Push to GitHub (unless --no-push) ─────────────────
if [ "${1:-}" != "--no-push" ]; then
  echo -e "${ORANGE}  Pushing ${BRANCH} to GitHub…${NC}"
  git push origin "${BRANCH}"
else
  echo -e "${ORANGE}  Skipping push (--no-push) — deploying current origin/${BRANCH}${NC}"
fi

LOCAL_SHA=$(git rev-parse --short "${BRANCH}")

# ── 2. SSH in and hard-sync the docroot to origin/main ───
echo -e "${ORANGE}  Syncing live docroot to origin/${BRANCH}…${NC}"
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 \
    -p "${SSH_PORT}" "${SSH_USER}@${SSH_HOST}" \
    "cd '${DOCROOT}' && git fetch origin && git reset --hard origin/${BRANCH} && git rev-parse --short HEAD"

echo -e "${GREEN}✓ Deploy complete — live docroot synced to ${LOCAL_SHA}${NC}"
echo -e "${ORANGE}  Verify: https://190align.com/${NC}"
