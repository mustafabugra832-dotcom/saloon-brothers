FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 5000
CMD ["sh", "-c", "if [ -f app.py ]; then gunicorn --bind 0.0.0.0:5000 app:app; else gunicorn --bind 0.0.0.0:5000 --chdir backend app:app; fi"]
