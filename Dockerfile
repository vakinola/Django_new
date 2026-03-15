FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=UTF-8
ENV PIP_NO_CACHE_DIR=1
ENV APP_HOME=/app
ENV PORT=8000

WORKDIR $APP_HOME

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    cmake \
    curl \
    libxml2-dev \
    libxslt1-dev \
    libffi-dev \
    libpq-dev \
    libgomp1 \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads \
    && chmod 755 /app/uploads

RUN useradd -m deployuser \
    && chown -R deployuser:deployuser $APP_HOME

USER deployuser

EXPOSE 8000
RUN python manage.py collectstatic --noinput
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "4", "--timeout", "1000", "--graceful-timeout", "30", "--keep-alive", "5"]
