#!/bin/bash
set -a
source "$(dirname "$0")/.env.local"
set +a
exec "$(dirname "$0")/node_modules/.bin/tsx" "$(dirname "$0")/telegram-bot.ts"
