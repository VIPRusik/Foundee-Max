const { Bot } = require('@maxhub/max-bot-api');
const config = require('./src/config');
const { createFetch } = require('./src/http');
const { register, COMMANDS } = require('./src/handlers');

if (!config.botToken) {
  console.error('❌ Не задан BOT_TOKEN. Скопируйте .env.example в .env и укажите токен бота.');
  process.exit(1);
}

const bot = new Bot(config.botToken, {
  clientOptions: { fetch: createFetch(config.caCertPath) },
});

register(bot);

bot.api.setMyCommands(COMMANDS).catch((error) => {
  console.warn('Не удалось обновить список команд бота:', error.message);
});

bot.start().catch((error) => {
  console.error('❌ Бот остановился с ошибкой:', error.message);
  process.exit(1);
});
console.log('✅ Бот запущен и слушает обновления...');

process.once('SIGINT', () => process.exit(0));
process.once('SIGTERM', () => process.exit(0));
