# Product Media Guide

## Model

`MediaAsset` + `ProductMedia` / `VariantMedia`

Fields: `objectKey`, `mimeType`, `externalUrl` (optional), `attribution`, `status`

## Admin workflow

1. Prefer uploading to object storage and storing `objectKey`  
2. For staging/demo, HTTPS `externalUrl` may be registered via `POST /v1/admin/catalog/media`  
3. MIME allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`  
4. Storefront uses `primaryImageUrl` from product media (not marketplace hotlinks)

## Production prerequisite

Object storage / CDN credentials remain an **EXTERNAL PREREQUISITE** for binary uploads at scale. Metadata registration works without live storage.

## Do not

- Scrape marketplace images  
- Present marketplace images as admin-owned assets without license  
- Use placeholder marketplace fixtures as production catalog media
