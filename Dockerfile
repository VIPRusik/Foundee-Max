FROM node:22-alpine

# Устанавливаем пакет для управленя сертификатами, копируем во временную папку, обновляем системное хранилище
RUN apk add --no-cache ca-certificates
COPY certs/russian_trusted_root_ca.pem /usr/local/share/ca-certificates/russian_trusted_root_ca.crt
COPY certs/russian_trusted_sub_ca.pem  /usr/local/share/ca-certificates/russian_trusted_sub_ca.crt
RUN update-ca-certificates

# Node.js должен использовать именно это хранилище
ENV NODE_OPTIONS="--use-openssl-ca"

# Устанавливаем рабочую директорию
WORKDIR /app

# Сначала копируем только файлы зависимостей, чтобы использовать кэш Docker
COPY package*.json ./

RUN npm config set strict-ssl false

# Устанавливаем зависимости (используем npm ci для чистой установки по package-lock.json)
# undici@6 уже не нужна, но удалять я её пока не хочу
RUN npm install
RUN npm install undici@6 



RUN npm config set strict-ssl true

# Копируем весь остальной код проекта
COPY . .

# Проверка работоспособности для хоста
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=3 \
  CMD curl --fail http://localhost:5000/healthz || exit 1

CMD ["node", "bot.js"]