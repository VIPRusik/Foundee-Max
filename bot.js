const { Agent, fetch: undiciFetch } = require('undici');
//const { Agent } = require('undici');
const fs = require('fs');

// Путь к файлу с сертификатом внутри контейнера
//const caPath = '/app/certs/russian_trusted_root_ca.pem';
//const ca = fs.readFileSync(caPath, `utf-8`);

// Читаем сертификаты и создаём агент
const ca = fs.readFileSync('/app/certs/russian_trusted_bundle.pem');

//я пытался решить проблему с сертификатом ниже, но всё что я смог - отключить проверку ценой безопасности.
//ну, у нас ведь ещё не product, верно?

//прежний вариант
const customAgent = new Agent({
  connect: { 
    ca: [ca],
    rejectUnauthorized: false //временно
  }
});

/*
//новый варик
const ca = fs.readFileSync(caPath); 
const customAgent = new Agent({
  connect: { ca: ca } // передаем Buffer целиком
});
*/

// Создаем функцию fetch, которая будет использовать этот агент
const customFetch = (url, options = {}) => {
  console.log('customFetch вызван для:', url); // проверка
  return undiciFetch(url, {
    ...options,
    dispatcher: customAgent
  });
};

globalThis.fetch = customFetch; //меняет глобальный fearch 
console.log('✅ Кастомный fetch с SSL-сертификатом создан.'); //ну да-да

/* //это старый кусок кода, хз зачем оставил его тут
try {
  const ca = fs.readFileSync(caPath);
  // Создаём диспетчер с нашими CA-сертификатами
  setGlobalDispatcher(new Agent({
    connect: { ca }
  }));
  // Подменяем глобальный fetch на fetch из undici
  globalThis.fetch = undiciFetch;
  console.log('Кастомный SSL-сертификат загружен, fetch переопределён.');
} catch (error) {
  console.error('Ошибка загрузки SSL-сертификата:', error);
}
*/ 

// кусок выше использует undici и нужен для работы с сертификатами МинЦифры

require('dotenv').config();
const path = require('path');
const { Bot, Keyboard } = require('@maxhub/max-bot-api');

// Создаём экземпляр бота с опцией fetch
const bot = new Bot(process.env.BOT_TOKEN, {
  clientOptions: {
    fetch: customFetch 
  }
});

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

// ---------- Роли пользователей ----------
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8') || '{}');
  } catch (e) {
    console.error('Ошибка чтения users.json:', e);
    return {};
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Ошибка записи users.json:', e);
  }
}

function getUserRole(userId) {
  const users = loadUsers();
  return users[userId]?.role || null;
}

function setUserRole(userId, role) {
  const users = loadUsers();
  users[userId] = { ...users[userId], role, updatedAt: new Date().toISOString() };
  saveUsers(users);
}

const ROLE_OPTIONS = [
  { key: 'employer', label: 'Я работодатель' },
  { key: 'seeker',   label: 'Я ищу работу' },
];

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
  const userId = ctx.userId || ctx.chatId;
  const role = getUserRole(userId);

  // Нет роли — спрашиваем
  if (!role) {
    const session = getSession(ctx.chatId);
    session.step = 'role';
    return ctx.reply(
      'Привет! Я Foundee-Max 👋\nПомогу быстро найти сотрудников или работу.\n\nКто вы?',
      keyboardExtra('role', ROLE_OPTIONS)
    );
  }

  // Роль уже есть — сразу в нужный сценарий
  return role === 'employer' ? startEmployerFlow(ctx) : startSeekerFlow(ctx);
}

function startEmployerFlow(ctx) {
  resetSession(ctx.chatId);
  const session = getSession(ctx.chatId);
  session.step = 'industry';
  session.data.role = 'employer';
  return ctx.reply(
    'Помогу найти сотрудников на сезонную или срочную вакансию 👋\n\nВ какой сфере вакансия?',
    keyboardExtra('industry', OPTIONS.industry)
  );
}

function startSeekerFlow(ctx) {
  resetSession(ctx.chatId);
  const session = getSession(ctx.chatId);
  session.step = 'seeker_industry';
  session.data.role = 'seeker';
  return ctx.reply(
    'Помогу найти подходящую работу 👋\n\nВ какой сфере ищете?',
    keyboardExtra('seeker_industry', OPTIONS.industry)
  );
}

// Команда смены роли
bot.command('change_role', (ctx) => {
  const userId = ctx.userId || ctx.chatId;
  const users = loadUsers();
  if (users[userId]) delete users[userId].role;
  saveUsers(users);
  return startFlow(ctx);
});

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

  // === Выбор роли ===
  if (step === 'role') {
    const userId = ctx.userId || chatId;
    setUserRole(userId, key);
    session.data.role = key;

    if (key === 'employer') {
      session.step = 'industry';
      return ctx.reply(
        'Отлично! В какой сфере вакансия?',
        keyboardExtra('industry', OPTIONS.industry)
      );
    } else {
      session.step = 'seeker_industry';
      return ctx.reply(
        'Отлично! В какой сфере ищете работу?',
        keyboardExtra('seeker_industry', OPTIONS.industry)
      );
    }
  }

    // === Сценарий соискателя ===
  if (step === 'seeker_industry') {
    session.data.industry = key;
    session.step = 'seeker_city';
    return ctx.reply('В каком городе ищете работу?');
  }

  if (step === 'seeker_employment') {
    session.data.employment_type = key;
    session.step = 'seeker_done';

    // TODO: здесь подставить функцию поиска вакансий
    return ctx.reply(
      `Ищу вакансии в сфере "${key}"...\n\nПока в MVP доступны только тестовые вакансии — список скоро появится.`,
    );
  }

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
    const idsParam = results.map((c) => c.id).join(',');
    const miniAppUrl = `https://max-miniapp-eight.vercel.app/?ids=${idsParam}`;

    return ctx.reply(resultText, {
      attachments: [
        {
          type: 'inline_keyboard',
          payload: {
            buttons: [[
              { type: 'open_app', text: '📋 Открыть список карточками', web_app: miniAppUrl }
            ]]
          }
        }
      ]
    });
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

  if (session.step === 'seeker_city') {
    if (text.length < 2) {
      return ctx.reply('Напишите название города, например: Москва');
    }
    session.data.city = text;
    session.step = 'seeker_employment';
    return ctx.reply(
      'Какой формат занятости вам подходит?',
      keyboardExtra('seeker_employment', OPTIONS.employment)
    );
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