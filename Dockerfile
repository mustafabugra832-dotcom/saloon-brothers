FROM python:3.11-slim
WORKDIR /app

# Install Flask, CORS, and Gunicorn
RUN pip install --no-cache-dir flask flask-cors gunicorn

# Copy all files
COPY . .

EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
