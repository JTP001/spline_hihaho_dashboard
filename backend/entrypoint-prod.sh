#!/bin/sh
set -e

echo "Waiting for database to be ready..."

# Extract host and port from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -E 's|.*://[^@]+@([^:/]+):?([0-9]*)/.*|\1|')
DB_PORT=$(echo $DATABASE_URL | sed -E 's|.*://[^@]+@([^:/]+):?([0-9]*)/.*|\2|')

# Default port if not set
DB_PORT=${DB_PORT:-5432}

until pg_isready -h "$DB_HOST" -p "$DB_PORT"; do
  echo "Waiting for DB at $DB_HOST:$DB_PORT..."
  sleep 1
done

if [ "$RUN_FETCH_ONLY" = "1" ]; then
  echo "=== Starting fetch job ==="
  python manage.py fetch_video_data
  echo "=== Fetch job complete ==="
  exit 0
fi

echo "Database is ready. Running Django setup..."

python manage.py makemigrations
python manage.py migrate --no-input

# Create superuser if it doesn't already exist
echo "Creating superuser if it doesn't already exist..."
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()
username = "${DJANGO_SUPERUSER_USERNAME}"
password = "${DJANGO_SUPERUSER_PASSWORD}"
email = "${DJANGO_SUPERUSER_EMAIL}"
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password, benesse=False)
    print(f"Superuser named {username} created.")
else:
    print(f"Superuser named {username} already exists.")
EOF

echo "Starting Gunicorn..."
exec gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --timeout 120