# Local Development with Docker

This project can run locally with a Postgres container and the provided `server/init-db.sql` initialization script.

## Start the local database

1. Ensure Docker Desktop is installed and running.
2. From the repository root, run:

```bash
docker compose up -d
```

3. Confirm the database container is running:

```bash
docker compose ps
```

## Database connection

The server uses the local database URL from `server/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

If you change the credentials, update both `docker-compose.yml` and `server/.env`.

## Reset the local database

To recreate the database from scratch:

```bash
docker compose down -v

docker compose up -d
```

## Inspect or connect to the database

Run a shell inside the container:

```bash
docker compose exec db psql -U postgres -d postgres
```

Then you can inspect tables with:

```sql
\dt
```

## Notes

- `server/init-db.sql` is mounted into the container and will run on the first start if the data volume is empty.
- If the DB volume already exists, the init script will not re-run unless you destroy the volume with `docker compose down -v`.
