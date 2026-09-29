# The "backup" and "restore" services in docker-compose.yml: PostgreSQL 16's
# own tools (pg_dump, psql, pg_restore, matching the db service), plus
# openssl for the encrypted copy of .env. Built from the scripts/ folder, so
# the build only reads the files it copies.
FROM postgres:16-alpine
RUN apk add --no-cache openssl
COPY backup-loop.sh /usr/local/bin/nk-backup
# Scripts checked out on Windows can have CRLF line endings; bash needs LF.
RUN sed -i 's/\r$//' /usr/local/bin/nk-backup && chmod 755 /usr/local/bin/nk-backup
ENTRYPOINT ["/usr/local/bin/nk-backup"]
CMD ["loop"]
