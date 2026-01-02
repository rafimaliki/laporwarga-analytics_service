# laporwarga-analytics_service

This is an analytics service that ingests data from the report service and processes metrics.

## Database

The service uses PostgreSQL as its database.

- **Database**: analytics_db
- **User**: postgres
- **Password**: password
- **Host Port**: 5433 (mapped to container port 5432)

## Database Initialization

### First Time Setup

1. Start the containers:

   ```bash
   docker compose up -d
   ```

2. Exec into the backend container:

   ```bash
   docker exec -it analytics_be bash
   ```

3. Inside the container, push the schema to the database (first time only):

   ```bash
   bun run db:push
   ```

4. Seed the database with initial data (first time only):
   ```bash
   bun run db:seed
   ```

### On Schema Changes

When you modify the schema in `src/db/schema.ts`, push the changes:

1. Exec into the backend container:

   ```bash
   docker exec -it analytics_be bash
   ```

2. Run:
   ```bash
   bun run db:push
   ```

## Running the Service

To run the service using Docker Compose:

```bash
docker compose up
```

The service will be available on port 5000.

## Triggering ETL

To trigger the ETL process, send a POST request to the `/api/etl/run` endpoint:

```bash
curl -X POST http://localhost:5000/api/etl/run
```
