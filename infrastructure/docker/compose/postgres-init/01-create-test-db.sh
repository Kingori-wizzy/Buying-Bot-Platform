#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  SELECT 'CREATE DATABASE buyingbot_test'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'buyingbot_test')\gexec
EOSQL
