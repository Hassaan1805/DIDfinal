#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "========================================"
echo "Decentralized Trust Platform Startup"
echo "========================================"

echo "[1/2] Starting backend on http://localhost:3001 ..."
(
  cd backend
  npm run dev
) &
BACKEND_PID=$!

sleep 2

echo "[2/2] Starting portal on http://localhost:5173 ..."
(
  cd portal
  npm run dev -- --host 0.0.0.0 --port 5173
) &
PORTAL_PID=$!

cleanup() {
  echo
  echo "Stopping platform processes..."
  kill "$BACKEND_PID" "$PORTAL_PID" 2>/dev/null || true
}

trap cleanup INT TERM

echo
echo "Platform running."
echo "Backend: http://localhost:3001/api/health"
echo "Portal:  http://localhost:5173"
echo "Press Ctrl+C to stop both services."

wait
