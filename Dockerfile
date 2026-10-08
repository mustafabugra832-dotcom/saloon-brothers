FROM python:3.11-slim
WORKDIR /app

# Copy repository content
COPY . .

# Install Flask, CORS, and Gunicorn
RUN pip install --no-cache-dir flask flask-cors gunicorn

# Expose port 5000
EXPOSE 5000

# Run Flask backend with Gunicorn flexibly
CMD ["sh", "-c", "if [ -f app.py ]; then gunicorn --bind 0.0.0.0:5000 app:app; else gunicorn --bind 0.0.0.0:5000 --chdir backend app:app; fi"]
