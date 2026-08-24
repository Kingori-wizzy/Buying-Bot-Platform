#!/usr/bin/env bash
# MinIO mirror backup to an offsite alias (configure mc alias offsite separately).
set -euo pipefail
BUCKET="${S3_BUCKET:-buyingbot-media}"
SRC_ALIAS="${MINIO_SRC_ALIAS:-local}"
DST_ALIAS="${MINIO_DST_ALIAS:-offsite}"

command -v mc >/dev/null || { echo "mc (MinIO client) required" >&2; exit 1; }
mc mirror --overwrite "${SRC_ALIAS}/${BUCKET}" "${DST_ALIAS}/${BUCKET}-backup"
echo "Mirrored ${SRC_ALIAS}/${BUCKET} -> ${DST_ALIAS}/${BUCKET}-backup"
echo "Offsite alias must point outside this VPS."
