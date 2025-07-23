FROM python:3.13.5-slim
WORKDIR /hihaho-dashboard-backend

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]