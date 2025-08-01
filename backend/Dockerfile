FROM python:3.13.5-slim
WORKDIR /hihaho-dashboard-backend

RUN apt-get update && \
    apt-get install -y postgresql-client && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ .

COPY backend/entrypoint-prod.sh /entrypoint-prod.sh
RUN chmod +x /entrypoint-prod.sh

EXPOSE 8000

CMD ["/entrypoint-prod.sh"]