# MinIO Production Object Storage

## Why

Laptop/`MEDIA_LOCAL_ROOT` is **dev only**. Production uses S3-compatible MinIO on the VPS.

## Flow

```
Admin upload → API validation → MinIO PutObject → MediaAsset row → storefront URL via API /v1/media/files/...
```

## Env

```
MEDIA_DRIVER=s3
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=buyingbot-media
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
MEDIA_PUBLIC_BASE_URL=https://api.example.com/v1/media/files
```

## Compose

- `minio` — data volume `buyingbot_prod_minio_data`, ports **not** published
- `minio-init` — creates private bucket (`anonymous none`)

## Security

- Private bucket by default; public reads go through API (authz/validation path)
- MIME + size limits in API (`upload-validation`)
- Do not expose MinIO console (9001) publicly

## Backup

`infrastructure/scripts/backup-minio.sh` mirrors to an offsite `mc` alias.

## EXTERNAL

Company may later swap MinIO for managed S3 by changing `S3_ENDPOINT` / keys only.
