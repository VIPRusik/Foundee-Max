require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Bot, Keyboard } = require('@maxhub/max-bot-api');

const bot = new Bot(process.env.BOT_TOKEN);

// ---------- Данные ----------
const candidates = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'candidates.json'), 'utf-8')
);

// ---------- Справочники вариантов ----------
// payload кодируем как "шаг:ключ" — так обработчик всегда понимает, что за кнопку нажали,
// даже без опоры на текущий session.step
const OPTIONS = {
  industry: [
    { key: 'retail', label: '🛒 Розница/торговля' },
    { key: 'horeca', label: '☕️ Общепит (кафе/рестораны)' },
    { key: 'agro', label: '🌾 АПК/сезонные работы' },
    { key: 'other', label: 'Другое' },
  ],
  employment: [
    { key: 'full', label: 'Полная занятость' },
    { key: 'part', label: 'Частичная занятость' },
    { key: 'shift', label: 'Подработка/разовая' },
  ],
  availability: [
    { key: 'urgent', label: '🔥 Сегодня-завтра' },
    { key: 'week', label: 'В течение недели' },
    { key: 'flexible', label: 'Не горит' },
  ],
};

function buildKeyboard(step, options) {
  const rows = options.map((opt) => [
    Keyboard.button.callback(opt.label, `${step}:${opt.key}`),
  ]);
  return Keyboard.inlineKeyboard(rows);
}

function keyboardExtra(step, options) {
  return { attachments: [buildKeyboard(step, options)] };
}

// ---------- Состояние диалога по chatId ----------
const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { step: 'idle', data: {} });
  }
  return sessions.get(chatId);
}

function resetSession(chatId) {
  sessions.set(chatId, { step: 'idle', data: {} });
}

// ---------- Matching ----------
function findCandidates(criteria) {
  let filtered = candidates.filter(
    (c) => c.industry === criteria.industry && c.employment_type === criteria.employment_type
  );

  if (filtered.length === 0) {
    filtered = candidates.filter((c) => c.industry === criteria.industry);
  }

  const scored = filtered.map((c) => {
    let score = 0;
    if (c.availability === criteria.availability) score += 2;
    if (criteria.city && c.city.toLowerCase().includes(criteria.city.toLowerCase())) score += 1;
    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

function formatResults(results) {
  if (results.length === 0) return null;
  const emojis = ['1️⃣', '2️⃣', '3️⃣'];
  let text = 'Нашёл подходящих кандидатов:\n\n';
  results.forEach((c, i) => {
    text += `${emojis[i]} ${c.name}, ${c.age} лет — ${c.experience}\n`;
    text += `📍 ${c.city} · 📞 ${c.phone}\n\n`;
  });
  text += 'Напиши /start, чтобы найти ещё.';
  return text.trim();
}

// ---------- Запуск диалога ----------
function startFlow(ctx) {
  resetSession(ctx.chatId);
  const session = getSession(ctx.chatId);
  session.step = 'industry';
  return ctx.reply(
    'Привет! Я помогу быстро найти сотрудников на сезонную или срочную вакансию 👋\n\nВ какой сфере вакансия?',
    keyboardExtra('industry', OPTIONS.industry)
  );
}

bot.command('start', (ctx) => startFlow(ctx));
bot.on('bot_started', (ctx) => startFlow(ctx));
bot.hears(['заново', 'сброс', 'restart', 'начать сначала'], (ctx) => startFlow(ctx));

// ---------- Обработка нажатий кнопок ----------
bot.on('message_callback', async (ctx) => {
  const chatId = ctx.chatId;
  const payload = ctx.callback.payload || '';
  const [step, key] = payload.split(':');

  await ctx.answerOnCallback({ notification: 'Принято' });

  const session = getSession(chatId);

  if (step === 'industry') {
    session.data.industry = key;
    session.step = 'city';
    return ctx.reply('В каком городе или районе?');
  }

  if (step === 'employment') {
    session.data.employment_type = key;
    session.step = 'availability';
    return ctx.reply(
      'Насколько срочно нужен человек?',
      keyboardExtra('availability', OPTIONS.availability)
    );
  }

  if (step === 'availability') {
    session.data.availability = key;
    session.step = 'done';

    const results = findCandidates(session.data);
    const resultText = formatResults(results);

    if (!resultText) {
      return ctx.reply('По этим параметрам пока никого не нашлось 😔\nНапиши /start, чтобы попробовать другие критерии.');
    }
    return ctx.reply(resultText);
  }
});

// ---------- Обработка текста (только для шага "город") ----------
bot.on('message_created', (ctx) => {
  const chatId = ctx.chatId;
  const text = (ctx.message.body.text || '').trim();

  if (!text || text.startsWith('/start')) return;

  const session = getSession(chatId);

  if (session.step === 'city') {
    if (text.length < 2) {
      return ctx.reply('Напиши название города текстом, например: Москва');
    }
    session.data.city = text;
    session.step = 'employment';
    return ctx.reply('Какой формат занятости?', keyboardExtra('employment', OPTIONS.employment));
  }

  return ctx.reply('Напиши /start, чтобы начать подбор сотрудников 👋');
});

// ---------- Глобальная защита от падений ----------
bot.catch((error, ctx) => {
  console.error('⚠️ Ошибка при обработке сообщения:', error);
  if (ctx && ctx.chatId) {
    resetSession(ctx.chatId);
  }
});

bot.start();
console.log('Бот запущен и слушает обновления...');