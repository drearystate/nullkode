# Restore a backup to a new installation

These steps restore into an **empty** installation. To replace an existing installation, back it up first and use a different Compose project name while testing the restore.

1. Extract the same release version used for the backup into a new folder.
2. Copy the backup's `.env` into that folder. Keep `AUTH_SECRET` unchanged. Update `PUBLIC_BASE_URL` if the address changes.
3. Run `docker compose up -d db` and wait until `docker compose ps` reports a healthy database.
4. Restore the database: `docker compose exec -T db pg_restore -U nullkode -d nullkode --exit-on-error < /path/to/backup/database.dump`.
5. Build the application: `docker compose build app`.
6. Restore files: `docker compose run --rm -T --no-deps --entrypoint tar app -xzf - < /path/to/backup/assets.tar.gz`.
7. Run `docker compose up -d --wait`. Open the app and sign in with your original owner account.
8. Check a saved app, uploaded image, AI connection, and payment settings before switching your domain to the restored server.

On Windows, use WSL or another Bash shell for the binary input/output redirection in these commands; older Windows PowerShell versions may corrupt binary streams.
