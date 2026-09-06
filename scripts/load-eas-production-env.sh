#!/usr/bin/env bash
# Sourced by release / build / OTA scripts. Sets REPO_ROOT and loads
# .env.mobile.production at the repo root when present (gitignored).

export REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export MOBILE_ROOT="$REPO_ROOT"

ENV_FILE="${MOBILE_PRODUCTION_ENV_FILE:-$REPO_ROOT/.env.mobile.production}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [ -z "${EXPO_PUBLIC_CONVEX_URL:-}" ] && [ -n "${NEXT_PUBLIC_CONVEX_URL:-}" ]; then
  export EXPO_PUBLIC_CONVEX_URL="$NEXT_PUBLIC_CONVEX_URL"
fi

if [ -z "${EXPO_PUBLIC_CONVEX_URL:-}" ]; then
  echo "❌ EXPO_PUBLIC_CONVEX_URL is not set."
  echo "   Local releases: copy .env.mobile.production.example → .env.mobile.production"
  echo "   EAS cloud: set EXPO_PUBLIC_CONVEX_URL for the production environment on expo.dev."
  exit 1
fi

if ! node -e "const u=new URL(process.env.EXPO_PUBLIC_CONVEX_URL); if(u.protocol!==\"https:\"||!u.hostname.endsWith(\".convex.cloud\")) process.exit(1)" 2>/dev/null; then
  echo "❌ EXPO_PUBLIC_CONVEX_URL must be an https URL with hostname ending in .convex.cloud."
  exit 1
fi

if [ -z "${EXPO_PUBLIC_WORKOS_CLIENT_ID:-}" ]; then
  echo "❌ EXPO_PUBLIC_WORKOS_CLIENT_ID is not set."
  exit 1
fi

echo "📎 Release Convex host: $(node -e "console.log(new URL(process.env.EXPO_PUBLIC_CONVEX_URL).hostname)")"
