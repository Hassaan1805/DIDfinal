#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BACKEND_BASE_URL="${BACKEND_BASE_URL:-http://127.0.0.1:3001}"
export ADMIN_TOKEN="${ADMIN_TOKEN:-integration-test-token}"

echo "========================================"
echo "Decentralized Trust Platform Test Suite"
echo "========================================"
echo "Backend base URL: ${BACKEND_BASE_URL}"
echo

echo "[1/5] Health check..."
curl -fsS "${BACKEND_BASE_URL}/api/health" >/dev/null

echo "[2/5] Enterprise end-to-end flow..."
npm --prefix backend run test:enterprise-e2e

echo "[3/5] Verifier profile flow..."
npm --prefix backend run test:verifier-profiles

echo "[4/5] Selective disclosure flow..."
npm --prefix backend run test:selective-disclosure

echo "[5/5] Auth timeline flow..."
npm --prefix backend run test:auth-timeline

echo
echo "All platform tests passed."
