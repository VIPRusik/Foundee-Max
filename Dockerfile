FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Сначала только файлы зависимостей, чтобы слой с node_modules кэшировался
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Код бота, тестовые данные и сертификаты Минцифры (certs/)
COPY . .

CMD ["node", "bot.js"]
