# TLS Setup (Let's Encrypt)

## Prerequisites

- DNS A/AAAA for shop/admin/api → VPS
- Ports 80/443 open
- Nginx HTTP serving `/.well-known/acme-challenge/`

## Issue (example)

```bash
sudo apt install certbot
sudo certbot certonly --webroot -w /var/lib/docker/volumes/buyingbot_prod_certbot_www/_data \
  -d shop.example.com -d admin.example.com -d api.example.com
```

Or use host nginx temporarily for issuance — adjust paths to match your layout.

## Compose

Set `TLS_CERT_HOST_DIR` to the directory containing:

- `fullchain.pem`
- `privkey.pem`

## Renewal

`certbot renew` + reload nginx container:

```bash
docker compose ... exec nginx nginx -s reload
```

## Status

Certificates are **EXTERNAL** until DNS exists — configs are ready; issuance is not claimed here.
