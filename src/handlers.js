const sessions = require('./sessions');
const scenarios = require('./scenarios');

const { STEPS } = scenarios;

const COMMANDS = [
  { name: 'start', description: 'Начать подбор' },
  { name: 'my_vacancies', description: 'Мои вакансии' },
  { name: 'change_role', description: 'Сменить роль' },
  { name: 'help', description: 'Справка' },
];

function splitPayload(payload = '') {
  const separator = payload.indexOf(':');
  if (separator === -1) return [payload, ''];
  return [payload.slice(0, separator), payload.slice(separator + 1)];
}

async function onCallback(ctx) {
  const [action, value] = splitPayload(ctx.callback.payload);
  const session = sessions.get(ctx.chatId);

  if (action === 'menu') {
    await ctx.answerOnCallback({ notification: 'Принято' });
    if (value === 'my') return scenarios.showMyVacancies(ctx);
    if (value === 'role') return scenarios.changeRole(ctx);
    return scenarios.startFlow(ctx);
  }

  if (action === 'vac_match' || action === 'vac_del') {
    await ctx.answerOnCallback({ notification: 'Принято' });
    return action === 'vac_match' ? scenarios.matchVacancy(ctx, value) : scenarios.deleteVacancy(ctx, value);
  }

  // Кнопка из старого сообщения или из опроса, прерванного перезапуском бота.
  if (!STEPS[action] || session.step !== action) {
    await ctx.answerOnCallback({ notification: 'Эта кнопка уже неактуальна' });
    if (!STEPS[session.step]) return scenarios.showMenu(ctx, 'Эта кнопка уже неактуальна. Что делаем дальше?');
    return scenarios.repeatStep(ctx, 'Эта кнопка относится к прошлому шагу. Продолжим отсюда:');
  }

  await ctx.answerOnCallback({ notification: 'Принято' });
  return scenarios.submitAnswer(ctx, action, value);
}

function onText(ctx) {
  const text = (ctx.message.body.text || '').trim();
  const session = sessions.get(ctx.chatId);
  const step = STEPS[session.step];

  if (!text) {
    return scenarios.repeatStep(ctx, 'Я понимаю только текст и нажатия кнопок.');
  }
  if (text.startsWith('/')) {
    return scenarios.showHelp(ctx, 'Не знаю такой команды.');
  }
  if (!step) {
    return scenarios.showMenu(ctx, 'Выберите действие кнопкой ниже или напишите /help.');
  }
  if (step.group) {
    return scenarios.repeatStep(ctx, 'Выберите вариант кнопкой ниже 👇');
  }
  return scenarios.submitAnswer(ctx, session.step, text);
}

function register(bot) {
  bot.command('start', (ctx) => scenarios.startFlow(ctx));
  bot.command('change_role', (ctx) => scenarios.changeRole(ctx));
  bot.command('my_vacancies', (ctx) => scenarios.showMyVacancies(ctx));
  bot.command('help', (ctx) => scenarios.showHelp(ctx));
  bot.hears(/^(заново|сброс|начать сначала|restart)$/i, (ctx) => scenarios.startFlow(ctx));
  bot.on('bot_started', (ctx) => scenarios.startFlow(ctx));
  bot.on('message_callback', onCallback);
  bot.on('message_created', onText);

  bot.catch(async (error, ctx) => {
    console.error('⚠️ Ошибка при обработке обновления:', error);
    if (!ctx?.chatId) return;
    sessions.reset(ctx.chatId);
    try {
      await ctx.reply('Что-то пошло не так 😔 Нажмите /start, чтобы начать заново.');
    } catch (replyError) {
      console.error('Не удалось сообщить пользователю об ошибке:', replyError.message);
    }
  });
}

module.exports = { register, COMMANDS };
