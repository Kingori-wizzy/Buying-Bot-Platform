# Hostinger VPS firewall (UFW)

Apply on the VPS after SSH access is confirmed. **Never lock out port 22** until you verify console access.

## Public (allow from anywhere)

| Port | Service                         |
| ---- | ------------------------------- |
| 22   | SSH                             |
| 80   | HTTP (ACME + redirect to HTTPS) |
| 443  | HTTPS (nginx — web, admin, API) |

## Private (must NOT be public)

| Service             | Default exposure                                       |
| ------------------- | ------------------------------------------------------ |
| PostgreSQL          | Docker internal only (`expose: 5432`, no host publish) |
| Redis               | Docker internal only                                   |
| MinIO API / console | Docker internal only                                   |
| API / worker / AI   | Docker internal only (via nginx)                       |
| Ollama (optional)   | Docker internal only                                   |

## Recommended UFW commands

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

## Verification

From an external machine:

```bash
nc -zv YOUR_VPS_IP 443   # should succeed
nc -zv YOUR_VPS_IP 5432  # should fail / timeout
nc -zv YOUR_VPS_IP 6379  # should fail / timeout
nc -zv YOUR_VPS_IP 9001  # should fail / timeout
nc -zv YOUR_VPS_IP 3000  # should fail / timeout
nc -zv YOUR_VPS_IP 3001  # should fail / timeout
nc -zv YOUR_VPS_IP 3002  # should fail / timeout
```

## Notes

- Do not publish Postgres/Redis/MinIO ports in `docker-compose.production.yml`.
- MinIO console (`9001`) is never exposed on the host.
- If you need emergency DB access, use SSH tunneling — not a public port.
