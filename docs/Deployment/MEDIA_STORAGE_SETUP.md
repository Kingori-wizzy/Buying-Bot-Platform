# Media storage setup (MinIO / S3)

## Production architecture

```
Admin upload (authenticated)
  → API MIME/size/path validation
  → MinIO/S3 object (MEDIA_DRIVER=s3)
  → PostgreSQL MediaAsset metadata
  → Public URL via API gateway GET /v1/media/files/products/:fileName
  → Storefront / search / AI product payloads
```

Local filesystem storage is **development only**. Production Compose sets `MEDIA_DRIVER=s3` and `S3_ENDPOINT=http://minio:9000` (Docker DNS, not the laptop).

## Environment

| Variable                                 | Role                                  |
| ---------------------------------------- | ------------------------------------- |
| `MEDIA_DRIVER`                           | `s3` or `minio` in production         |
| `S3_ENDPOINT`                            | Internal MinIO or external S3/R2      |
| `S3_REGION`                              | Default `us-east-1`                   |
| `S3_BUCKET`                              | e.g. `buyingbot-media`                |
| `S3_ACCESS_KEY_ID` / `S3_ACCESS_KEY`     | MinIO root user                       |
| `S3_SECRET_ACCESS_KEY` / `S3_SECRET_KEY` | MinIO root password (min 8 chars)     |
| `S3_FORCE_PATH_STYLE`                    | `true` for MinIO                      |
| `MEDIA_PUBLIC_BASE_URL`                  | `https://<API_DOMAIN>/v1/media/files` |
| `MEDIA_MAX_BYTES`                        | Default 5 MiB                         |

MinIO **API (9000)** and **console (9001)** are Compose `expose` only — not published on the host. Do not open them on UFW.

Bucket init: `minio-init` creates the bucket and sets anonymous access to **none**. Public reads go through the API.

## Upload controls (implemented)

- Allowed MIME: JPEG, PNG, WebP, GIF
- Size limit (`MEDIA_MAX_BYTES`)
- Filename sanitization / generated object keys
- Path traversal rejection on local get/delete
- Admin session + `catalog:create` / `catalog:update` permission
- Delete: `DELETE /v1/admin/catalog/media/:id` (metadata + object best-effort)

## Offsite copies

`infrastructure/scripts/backup-minio.sh` mirrors via `mc` to an **offsite alias**. Configure that alias with company credentials (EXTERNAL_PREREQUISITE). Same-disk-only copies are not disaster recovery.
