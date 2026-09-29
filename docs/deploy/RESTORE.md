# Backups and restoring

## What gets backed up

With Docker, the `backup` service makes a backup every night at 03:30 while
Nullkode keeps running. You can change the time and how many backups are
kept in `.env` (`BACKUP_*`, see `.env.example`). Each backup is a folder in
`backups/` named after the time it started (UTC), for example
`backups/20260929T033000Z`:

| File | What it is |
|---|---|
| `database.dump` | the whole database: accounts, apps, pages, workflows, app data, settings |
| `uploads.tar.gz` | files apps keep privately, including the key that signs your Android apps |
| `public-uploads.tar.gz` | pictures and files uploaded to apps |
| `assets-cloned.tar.gz` | files of websites you imported. Only in the weekly backup (Sundays, `BACKUP_WEEKLY_DAY`) and in backups you make yourself, because it can be large |
| `env.enc` | your `.env`, encrypted with `BACKUP_PASSPHRASE`. Only when that is set |
| `rowcounts.txt`, `SHA256SUMS`, `manifest.json` | what's in the backup, so a restore can be checked |

It keeps the last 7 daily and 4 weekly backups. Backups you make yourself are
never deleted automatically. The admin pages show when the last backup ran
and whether it worked.

**Your `.env` is the key to your data.** It holds `AUTH_SECRET`, which
unlocks the AI and payment keys saved in the database. Set
`BACKUP_PASSPHRASE` in `.env` so each backup includes an encrypted copy, and
write the passphrase down somewhere safe away from this server. Without a
passphrase `.env` is left out of backups: keep your own copy.

**Copy backups to another device.** A backup on the same disk doesn't help if
the disk fails. Backups hold your customers' data, so keep them private.

### Make a backup now

- Linux or macOS: `bash scripts/backup.sh`
- Windows (PowerShell, in the Nullkode folder): `docker compose run --rm backup once`

Do this before every update.

## Test a backup

Once in a while, check that a backup really works. On the same computer, next
to your running installation:

```sh
bash scripts/restore.sh backups/20260929T033000Z --verify
```

It restores the backup into a throwaway copy (Compose project
`nullkode-verify`), checks that every table has the same number of rows as
when the backup was made, starts Nullkode on the copy, checks it answers,
and then removes the copy. Your installation isn't touched. It needs a few
minutes and enough free disk space for a second copy of the data.

## Restore onto a new server or folder

A backup is restored into a **new, empty** installation. The restore refuses
to write into a database that already has data, so it can't overwrite a
working installation by mistake.

### Linux or macOS

1. Install Docker. Download the **same Nullkode version** the backup was made
   with (`appVersion` in the backup's `manifest.json`) and extract it into a
   new folder. **Don't run the installer yet.**
2. Copy the backup folder into the new folder, for example into
   `backups/20260929T033000Z`.
3. Put your `.env` in the new folder. If the backup has `env.enc`, you can skip
   this: step 5 recovers `.env` from it and asks for the passphrase. Keep
   `AUTH_SECRET` unchanged. If the web address changes, update
   `PUBLIC_BASE_URL` afterwards.
4. Check the backup (this changes nothing):
   `bash scripts/restore.sh backups/20260929T033000Z`
5. Restore it:
   `bash scripts/restore.sh backups/20260929T033000Z --apply`
   It checks the files against their checksums, restores the database and
   the files, compares every table's rows with the backup, then builds and
   starts Nullkode.
6. Open the web address and sign in with your usual owner account. Check a
   saved app, an uploaded picture, the AI connection and your payment
   settings before you point your domain at the new server.

HTTPS certificates don't need a backup: they are made again on the first
visit to each address.

### Windows

Use PowerShell in the new Nullkode folder. Follow steps 1 and 2 above, then:

1. Put your `.env` in the folder (Windows can't recover it from `env.enc` by
   itself; to open `env.enc` see [below](#open-envenc-by-hand)).
2. `docker compose up -d --wait db`
3. Check the backup: `docker compose run --rm restore 20260929T033000Z`
4. Restore it: `docker compose run --rm restore 20260929T033000Z --apply`
5. `docker compose up -d --build --wait`, then sign in and check as in step 6
   above.

The backup has to be in the `backups` folder (or the folder `BACKUP_DIR`
points to) for these commands.

### Replacing a broken installation on the same computer

`docker-compose.yml` names its data volumes after the Compose project
`nullkode`. A second folder on the same computer would use the same volumes,
and the restore would refuse to run. Give the new folder its own project name
by adding `COMPOSE_PROJECT_NAME=nullkode2` to its `.env`, and stop the old
installation first (`docker compose stop` in the old folder). Never use
`docker compose down -v` on an installation you might still need: it deletes
the data.

### Without Docker (systemd)

The same restore works with the PostgreSQL tools on the server. Create an
empty database, put `DATABASE_URL` for it in `.env`, then, from the Nullkode
folder, as the user that runs Nullkode:

```sh
set -a; . ./.env; set +a
BACKUP_SOURCE_ROOT="$PWD" RESTORE_OWNER="$(id -u):$(id -g)" \
  bash scripts/backup-loop.sh restore /var/backups/nullkode/20260929T033000Z           # check
BACKUP_SOURCE_ROOT="$PWD" RESTORE_OWNER="$(id -u):$(id -g)" \
  bash scripts/backup-loop.sh restore /var/backups/nullkode/20260929T033000Z --apply   # restore
```

Then build and start Nullkode as usual (see [plesk.md](plesk.md), "Updating").
If `.env` has lines with spaces that the shell can't read, export
`DATABASE_URL` by hand instead of the `set -a` line.

## Backups made by older versions

Older versions of `scripts/backup.sh` stopped the app and saved
`database.dump`, `assets.tar.gz` and a plain copy of `.env`. `restore.sh`
restores those too; they have no checksums, so they can't be checked first.
Automatic clean-up never deletes them.

## Open env.enc by hand

With OpenSSL 1.1.1 or newer (Linux, WSL, Git Bash, or Homebrew's openssl on
macOS), in the backup folder:

```sh
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in env.enc -out .env
```

It asks for the passphrase. Without OpenSSL, Docker can do it (PowerShell, in
the backup folder):

```powershell
docker run --rm -it -v "${PWD}:/work" -w /work alpine:3 sh -c "apk add -q openssl && openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in env.enc -out .env"
```
