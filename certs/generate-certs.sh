#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert not found. Installing via Homebrew..."
  brew install mkcert
fi

echo "Installing local CA into the system/browser trust store (may prompt for your password)..."
mkcert -install

echo "Issuing certificate for localhost, 127.0.0.1, ::1..."
mkcert -key-file "$CERT_DIR/localhost-key.pem" -cert-file "$CERT_DIR/localhost.pem" localhost 127.0.0.1 ::1

echo "Done."
echo "  Certificate: $CERT_DIR/localhost.pem"
echo "  Key:         $CERT_DIR/localhost-key.pem"