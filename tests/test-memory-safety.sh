#!/usr/bin/env bash
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../memory-safety" && pwd)"

echo "Building memory-safety demo binaries..."
make -C "$DIR" clean all

LONG_INPUT=$(python3 -c "print('A' * 200)" 2>/dev/null || perl -e 'print "A" x 200')

echo
echo "=== Feeding a 200-byte input to vulnerable (16-byte buffer, strcpy) ==="
"$DIR/vulnerable" "$LONG_INPUT"
VULN_EXIT=$?
if [ "$VULN_EXIT" -ne 0 ]; then
  echo "vulnerable exited with code $VULN_EXIT -- expected: caught by the stack protector (e.g. 'stack smashing detected', SIGABRT)."
else
  echo "WARNING: vulnerable did not crash -- unexpected on this platform/toolchain."
fi

echo
echo "=== Feeding the same 200-byte input to safe (16-byte buffer, strncpy) ==="
"$DIR/safe" "$LONG_INPUT"
SAFE_EXIT=$?
if [ "$SAFE_EXIT" -eq 0 ]; then
  echo "safe exited 0 -- input was truncated safely, no overflow occurred."
else
  echo "UNEXPECTED: safe should not crash. Exit code: $SAFE_EXIT"
fi