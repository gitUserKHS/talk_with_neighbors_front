#!/usr/bin/env bash
set -euo pipefail

origin="${1:?usage: assert-nginx-security-headers.sh <origin>}"

assert_security_headers() {
  local path="$1"
  local headers
  local expected

  headers="$(curl --fail --silent --show-error --dump-header - --output /dev/null "${origin}${path}")"
  headers="${headers//$'\r'/}"

  for expected in \
    'Strict-Transport-Security: max-age=31536000; includeSubDomains' \
    'X-Content-Type-Options: nosniff' \
    'X-Frame-Options: DENY' \
    'Referrer-Policy: strict-origin-when-cross-origin'; do
    if ! grep --fixed-strings --ignore-case --line-regexp --quiet -- "$expected" <<<"$headers"; then
      printf 'Missing required security header on %s: %s\n' "$path" "$expected" >&2
      exit 1
    fi
  done
}

assert_security_headers "/"
assert_security_headers "/healthz"
