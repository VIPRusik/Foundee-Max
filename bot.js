require('dotenv').config();
const { Bot } = require('@maxhub/max-bot-api');

const bot = new Bot(process.env.BOT_TOKEN);

bot.api.setMyCommands([
  { name: 'start', description: 'Начать работу с ботом' }
]);

bot.command('start', (ctx) => {
  return ctx.reply('Привет! Я помогу подобрать сезонных сотрудников для твоего бизнеса 👋');
});

bot.on('message', (ctx) => {
  return ctx.reply(`Ты написал: ${ctx.message.body.text}`);
});

bot.start();
console.log('Бот запущен и слушает обновления...');