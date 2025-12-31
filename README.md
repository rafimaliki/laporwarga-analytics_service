# laporwarga-analytics_service

This is an analytics service that ingests data from the report service and processes metrics.

## Database

The service uses PostgreSQL as its database.

- **Database**: analytics_db
- **User**: postgres
- **Password**: password
- **Host Port**: 5433 (mapped to container port 5432)

## Running the Service

To run the service using Docker Compose:

```bash
docker compose up
```

The service will be available on port 5000.
