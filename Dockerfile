# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Bağımlılıkları kopyala ve kur
COPY package.json package-lock.json* pnpm-workspace.yaml* ./
RUN npm install

# Kaynak kodları kopyala ve derle
COPY . .
RUN npm run build

# Stage 2: Backend ve Sunum
FROM python:3.11-slim

WORKDIR /app

# PostgreSQL bağlantısı (psycopg2) için gerekli sistem paketleri
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Backend gereksinimlerini kopyala ve kur
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Backend kodlarını kopyala
COPY backend/ ./backend/

# Frontend'in derlenmiş halini Stage 1'den kopyala
COPY --from=frontend-builder /app/dist ./dist

# Upload klasörünü oluştur ve yetki ver
RUN mkdir -p /app/backend/uploads && chmod 777 /app/backend/uploads

# Çevresel değişkenler (Waitress'in devreye girmesi için FLASK_ENV=production)
ENV FLASK_ENV=production
ENV PORT=5000

# Portu dışa aç
EXPOSE 5000

# Uygulamayı başlat
CMD ["python", "backend/app.py"]
