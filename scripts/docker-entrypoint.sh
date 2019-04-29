#!/bin/bash

echo "Running docker-entrypoint.sh"

until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USERNAME" -c '\l'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up"

npm run db:create; npm run db:migrate

node --version

npm --version

exec "$@"