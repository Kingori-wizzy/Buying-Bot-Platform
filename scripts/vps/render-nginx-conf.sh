#!/usr/bin/env bash
# Substitute shop/admin/api hostnames into production.conf
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONF="${ROOT}/infrastructure/nginx/production.conf"
WEB_HOST="${SHOP_DOMAIN:-${WEB_HOST:-shop.example.com}}"
ADMIN_HOST="${ADMIN_DOMAIN:-${ADMIN_HOST:-admin.example.com}}"
API_HOST="${API_DOMAIN:-${API_HOST:-api.example.com}}"
WEB_HOST="${WEB_HOST#https://}"
WEB_HOST="${WEB_HOST#http://}"
ADMIN_HOST="${ADMIN_HOST#https://}"
ADMIN_HOST="${ADMIN_HOST#http://}"
API_HOST="${API_HOST#https://}"
API_HOST="${API_HOST#http://}"

cp "$CONF" "${CONF}.bak"
sed \
  -e "s/shop\\.example\\.com/${WEB_HOST}/g" \
  -e "s/admin\\.example\\.com/${ADMIN_HOST}/g" \
  -e "s/api\\.example\\.com/${API_HOST}/g" \
  "${CONF}.bak" > "$CONF"
echo "Updated $CONF (shop=${WEB_HOST} admin=${ADMIN_HOST} api=${API_HOST})"
