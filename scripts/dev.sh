#!/bin/bash
# Kill any processes on ports 3000 and 4000 before starting
echo "Cleaning up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
echo "Starting dev servers..."
pnpm dev
