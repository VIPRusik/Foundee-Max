# Foundee-Max

## Запуск с использованием Docker
Для запуска решения нужен Docker и Docker Compose.

1. Переделать `.env.example` -> `.env` и заполнить переменные (токен бота): 
```bash 
cp .env.example .env 
```

2. Запуск 
```bash 
docker-compose up -d --build
```

3. Проверка
```bash 
docker-compose logs -f
```

4. Для остановки 
```bash 
docker-compose down
```
