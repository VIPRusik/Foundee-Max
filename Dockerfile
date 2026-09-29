# Используем легковесный образ Node.js
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Сначала копируем только файлы зависимостей, чтобы использовать кэш Docker
COPY package*.json ./

RUN npm config set strict-ssl false

# Устанавливаем зависимости (используем npm ci для чистой установки по package-lock.json)
RUN npm install

RUN npm config set strict-ssl true

# Копируем весь остальной код проекта
COPY . .

# Открываем порт для мини-аппа
EXPOSE 3000

# Команда для запуска бота
CMD ["node", "bot.js"]