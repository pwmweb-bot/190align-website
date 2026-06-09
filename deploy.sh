#!/bin/bash
# ─────────────────────────────────────────────────────────
# 190align.com — Direct SFTP Deploy Script
# Usage:  ./deploy.sh              (sync all changed files)
#         ./deploy.sh blog/        (sync only blog/ directory)
#         ./deploy.sh index.html   (sync single file)
# ─────────────────────────────────────────────────────────

SFTP_HOST="sftp.lhr.stackcp.com"
SFTP_PORT="10511"
SFTP_USER="deploy@190align.com"
SFTP_PASSWORD="KCFCJhyZQCMR3Wdz34XRcXZXQdQpmR1g"

# Colours
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${ORANGE}▶ 190align deploy — sftp.lhr.stackcp.com:10511${NC}"

# ── Single file or directory upload ─────────────────────
if [ -n "$1" ]; then
  TARGET="$1"
  # Strip leading ./
  TARGET="${TARGET#./}"
  # Determine remote path (preserve directory structure)
  REMOTE_DIR=$(dirname "/$TARGET")

  echo -e "${ORANGE}  Uploading: ${TARGET}${NC}"

  lftp -u "$SFTP_USER","$SFTP_PASSWORD" sftp://"$SFTP_HOST":"$SFTP_PORT" <<EOF
set sftp:auto-confirm yes
set net:max-retries 3
cd /
$(if [ -d "$TARGET" ]; then echo "mirror --reverse --delete --verbose --exclude ^\.git/ \"$TARGET\" \"/$TARGET\""; else echo "put \"$TARGET\" -o \"/$TARGET\""; fi)
bye
EOF

# ── Full mirror sync ─────────────────────────────────────
else
  echo -e "${ORANGE}  Full sync — mirroring all changed files${NC}"

  lftp -u "$SFTP_USER","$SFTP_PASSWORD" sftp://"$SFTP_HOST":"$SFTP_PORT" <<EOF
set sftp:auto-confirm yes
set net:max-retries 3
set net:reconnect-interval-base 5
mirror --reverse --delete --verbose \
  --exclude ^\.git/ \
  --exclude ^\.github/ \
  --exclude ^\.claude/ \
  --exclude ^\.strategy/ \
  --exclude ^content-strategy/ \
  --exclude ^seo-audit/ \
  --exclude ^guides-src/ \
  --exclude ^deploy\.sh \
  --exclude ^\.env \
  --exclude ^\.DS_Store \
  . /
bye
EOF
fi

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Deploy complete${NC}"
else
  echo -e "${RED}✗ Deploy failed — check SFTP credentials or connection${NC}"
  exit 1
fi
