require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Bot } = require('@maxhub/max-bot-api');

const bot = new Bot(process.env.BOT_TOKEN);

// ---------- Данные ----------
const candidates = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'candidates.json'), 'utf-8')
);

// ---------- Справочники вариантов по шагам ----------
const OPTIONS = {
  industry: [
    { key: 'retail', label: '🛒 Розница/торговля' },
    { key: 'horeca', label: '☕️ Общепит (кафе/рестораны)' },
    { key: 'agro', label: '🌾 АПК/сезонные работы' },
    { key: 'other', label: 'Другое' },
  ],
  employment_type: [
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

function renderMenu(title, options) {
  let text = `${title}\n\n`;
  options.forEach((opt, i) => {
    text += `${i + 1}. ${opt.label}\n`;
  });
  text += '\nОтветь номером варианта.';
  return text;
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
    'Привет! Я помогу быстро найти сотрудников на сезонную или срочную вакансию 👋\n\n' +
      renderMenu('В какой сфере вакансия?', OPTIONS.industry)
  );
}

bot.command('start', (ctx) => startFlow(ctx));
bot.on('bot_started', (ctx) => startFlow(ctx));

bot.hears(['заново', 'сброс', 'restart', 'начать сначала'], (ctx) => startFlow(ctx));

// ---------- Движок диалога ----------
bot.on('message_created', (ctx) => {
  const chatId = ctx.chatId;
  const text = (ctx.message.body.text || '').trim();

  if (!text || text.startsWith('/start')) return;

  const session = getSession(chatId);

  if (session.step === 'industry') {
    const idx = parseInt(text, 10) - 1;
    const chosen = OPTIONS.industry[idx];
    if (!chosen) {
      return ctx.reply('Не понял ответ 🙁 Напиши номер варианта от 1 до ' + OPTIONS.industry.length);
    }
    session.data.industry = chosen.key;
    session.step = 'city';
    return ctx.reply('В каком городе или районе?');
  }

  if (session.step === 'city') {
    if (text.length < 2) {
      return ctx.reply('Напиши название города текстом, например: Москва');
    }
    session.data.city = text;
    session.step = 'employment';
    return ctx.reply(renderMenu('Какой формат занятости?', OPTIONS.employment_type));
  }

  if (session.step === 'employment') {
    const idx = parseInt(text, 10) - 1;
    const chosen = OPTIONS.employment_type[idx];
    if (!chosen) {
      return ctx.reply('Не понял ответ 🙁 Напиши номер варианта от 1 до ' + OPTIONS.employment_type.length);
    }
    session.data.employment_type = chosen.key;
    session.step = 'availability';
    return ctx.reply(renderMenu('Насколько срочно нужен человек?', OPTIONS.availability));
  }

  if (session.step === 'availability') {
    const idx = parseInt(text, 10) - 1;
    const chosen = OPTIONS.availability[idx];
    if (!chosen) {
      return ctx.reply('Не понял ответ 🙁 Напиши номер варианта от 1 до ' + OPTIONS.availability.length);
    }
    session.data.availability = chosen.key;
    session.step = 'done';

    const results = findCandidates(session.data);
    const resultText = formatResults(results);

    if (!resultText) {
      return ctx.reply('По этим параметрам пока никого не нашлось 😔\nНапиши /start, чтобы попробовать другие критерии.');
    }
    return ctx.reply(resultText);
  }

  return ctx.reply('Напиши /start, чтобы начать подбор сотрудников 👋');
});

bot.catch((error, ctx) => {
  console.error('⚠️ Ошибка при обработке сообщения:', error);
  if (ctx && ctx.chatId) {
    resetSession(ctx.chatId);
  }
});

bot.start();
console.log('Бот запущен и слушает обновления...');