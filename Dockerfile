FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY . .
RUN if [ -d frontend ] && [ -f frontend/package.json ]; then cd frontend && npm install && npm run build; else npm install && npm run build; fi

FROM python:3.11-slim
WORKDIR /app
COPY --from=frontend-builder /app /app
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; elif [ -f backend/requirements.txt ]; then pip install --no-cache-dir -r backend/requirements.txt; else pip install --no-cache-dir flask flask-cors gunicorn; fi

EXPOSE 5000
CMD ["sh", "-c", "if [ -f app.py ]; then gunicorn --bind 0.0.0.0:5000 app:app; else gunicorn --bind 0.0.0.0:5000 --chdir backend app:app; fi"]
