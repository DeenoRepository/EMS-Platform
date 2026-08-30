# Air-gap Docker deployment

This guide describes the Docker-based offline bundle. It is separate from
[`BAREMETAL_OFFLINE_DEPLOYMENT.md`](BAREMETAL_OFFLINE_DEPLOYMENT.md), which
uses Node.js/PostgreSQL directly without Docker.

## Build the bundle

Run on a machine with source code, Docker, and internet access:

### Linux / macOS

```bash
chmod +x scripts/airgap-pack.sh
./scripts/airgap-pack.sh
```

### Windows PowerShell

```powershell
.\scripts\airgap-pack.ps1
```

The packer builds the EMS image, downloads the PostgreSQL and Nginx images,
and creates a transferable archive containing the offline compose file,
configuration template, installer, and backup scripts.

## Install on the isolated target

1. Transfer the generated `.tar.gz` or `.zip` archive to the target machine.
2. Extract the archive into a dedicated directory.
3. Ensure Docker Engine and Docker Compose v2 are installed locally.
4. Review `.env.production.example`; the installer creates
   `.env.production` if it does not exist. Replace every placeholder before
   exposing the service to users.
5. Run the installer:

   ```bash
   ./install.sh
   ```

   or in PowerShell:

   ```powershell
   .\install.ps1
   ```

6. Verify the service:

   ```bash
   docker compose -f docker-compose.yml ps
   docker compose -f docker-compose.yml logs -f
   ```

## Important boundaries

- This mode requires Docker on the target. For a no-Docker isolated target,
  use [`BAREMETAL_OFFLINE_DEPLOYMENT.md`](BAREMETAL_OFFLINE_DEPLOYMENT.md).
- The generated archive contains images and may be large. Do not commit the
  generated bundle, archive, or runtime `uploads/` directory.
- Do not use the local development compose file for production.
- Back up the database and uploads before upgrades using the bundled
  [`backup.sh`](../../scripts/backup.sh) or [`backup.ps1`](../../scripts/backup.ps1).
