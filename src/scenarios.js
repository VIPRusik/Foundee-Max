const sessions = require('./sessions');
const users = require('./users');
const vacancies = require('./vacancies');
const keyboards = require('./keyboards');
const miniapp = require('./miniapp');
const format = require('./format');
const { STEPS } = require('./steps');
const { findCandidates, findVacancies } = require('./matching');
const { isValidKey, MAX_VACANCIES_PER_USER } = require('./options');

function userIdOf(ctx) {
  return ctx.user?.user_id ?? ctx.chatId;
}

function roleOf(ctx) {
  return users.getUser(userIdOf(ctx)).role || null;
}

// ---------- Опрос ----------
function ask(ctx, stepName, intro) {
  const session = sessions.get(ctx.chatId);
  session.step = stepName;
  const step = STEPS[stepName];
  const text = intro ? `${intro}\n\n${step.prompt}` : step.prompt;

  let attachments;
  if (step.group) attachments = keyboards.choice(stepName, step.group);
  else if (step.skippable) attachments = keyboards.skip(stepName);
  return ctx.reply(text, attachments ? { attachments } : undefined);
}

function repeatStep(ctx, hint) {
  const { step } = sessions.get(ctx.chatId);
  if (!STEPS[step]) return showMenu(ctx, hint);
  return ask(ctx, step, hint);
}

async function submitAnswer(ctx, stepName, rawValue) {
  const step = STEPS[stepName];
  const session = sessions.get(ctx.chatId);

  let value;
  if (step.group) {
    if (!isValidKey(step.group, rawValue)) return repeatStep(ctx, 'Выберите вариант кнопкой ниже 👇');
    value = rawValue;
  } else if (step.skippable && rawValue === 'skip') {
    value = null;
  } else {
    value = step.validate(rawValue.trim());
    if (value === null) return ask(ctx, stepName, `⚠️ ${step.error}`);
  }

  if (stepName === 'role') return chooseRole(ctx, value);

  session.data[step.field] = value;
  const next = typeof step.next === 'function' ? step.next(userIdOf(ctx)) : step.next;
  if (next === 'employer_done') return finishEmployer(ctx);
  if (next === 'seeker_done') return finishSeeker(ctx);
  return ask(ctx, next);
}

// ---------- Вход и роли ----------
function startFlow(ctx) {
  sessions.reset(ctx.chatId);
  const role = roleOf(ctx);
  if (role === 'employer') return startEmployer(ctx);
  if (role === 'seeker') return startSeeker(ctx);
  return ask(
    ctx,
    'role',
    'Привет! Я Foundee-Max 👋\nПомогаю работодателям быстро закрывать сезонные и срочные вакансии, а соискателям — находить подработку рядом.'
  );
}

function chooseRole(ctx, role) {
  users.setRole(userIdOf(ctx), role);
  return role === 'employer' ? startEmployer(ctx, 'Отлично!') : startSeeker(ctx, 'Отлично!');
}

function changeRole(ctx) {
  users.clearRole(userIdOf(ctx));
  sessions.reset(ctx.chatId);
  return ask(ctx, 'role', 'Выберите новую роль. Ваши вакансии сохранятся.');
}

// ---------- Работодатель ----------
function startEmployer(ctx, intro) {
  sessions.reset(ctx.chatId);
  if (!vacancies.canCreate(userIdOf(ctx))) {
    return showMyVacancies(
      ctx,
      `У вас уже ${MAX_VACANCIES_PER_USER} вакансии — это максимум. Удалите одну, чтобы создать новую, или подберите кандидатов по существующей.`
    );
  }
  const greeting = 'Создадим вакансию и сразу подберём кандидатов — это займёт меньше минуты.';
  return ask(ctx, 'industry', intro ? `${intro} ${greeting}` : greeting);
}

async function finishEmployer(ctx) {
  const userId = userIdOf(ctx);
  const { data } = sessions.get(ctx.chatId);
  sessions.reset(ctx.chatId);

  if (data.phone) users.setPhone(userId, data.phone);
  const phone = data.phone || users.getUser(userId).phone;
  const vacancy = vacancies.create(userId, { ...data, phone });

  if (!vacancy) {
    return showMyVacancies(ctx, `Не удалось сохранить: у вас уже ${MAX_VACANCIES_PER_USER} вакансии.`);
  }

  const saved = `✅ Вакансия «${vacancy.title}» сохранена — соискатели увидят её в поиске.\nКонтакт для связи: ${phone}`;
  return replyCandidates(ctx, vacancy, saved);
}

function replyCandidates(ctx, criteria, intro) {
  const found = findCandidates(criteria);
  if (found.length === 0) {
    return ctx.reply(`${intro}\n\nПодходящих кандидатов пока нет 😔`, { attachments: keyboards.menu('employer') });
  }
  return ctx.reply(`${intro}\n\n${format.candidatesText(found)}`, {
    attachments: keyboards.results(miniapp.candidatesUrl(found), 'employer'),
  });
}

function showMyVacancies(ctx, intro) {
  const list = vacancies.listByOwner(userIdOf(ctx));
  const role = roleOf(ctx);
  const prefix = intro ? `${intro}\n\n` : '';

  if (list.length === 0) {
    return ctx.reply(`${prefix}У вас пока нет вакансий.`, { attachments: keyboards.menu(role) });
  }
  const lines = list.map((v, i) => `${i + 1}. ${format.vacancyLine(v)}`).join('\n\n');
  return ctx.reply(
    `${prefix}Ваши вакансии (${list.length} из ${MAX_VACANCIES_PER_USER}):\n\n${lines}\n\n` +
      '🔍 — подобрать кандидатов заново, 🗑 — удалить.',
    { attachments: keyboards.myVacancies(list, role) }
  );
}

function matchVacancy(ctx, id) {
  const vacancy = vacancies.findById(id);
  if (!vacancy || vacancy.ownerId !== userIdOf(ctx)) {
    return showMyVacancies(ctx, 'Эта вакансия уже удалена.');
  }
  return replyCandidates(ctx, vacancy, `Кандидаты для вакансии «${vacancy.title}»:`);
}

function deleteVacancy(ctx, id) {
  const removed = vacancies.remove(userIdOf(ctx), id);
  return showMyVacancies(ctx, removed ? '🗑 Вакансия удалена.' : 'Эта вакансия уже удалена.');
}

// ---------- Соискатель ----------
function startSeeker(ctx, intro) {
  sessions.reset(ctx.chatId);
  const greeting = 'Подберу вакансии по трём вопросам.';
  return ask(ctx, 'seeker_industry', intro ? `${intro} ${greeting}` : greeting);
}

function finishSeeker(ctx) {
  const { data } = sessions.get(ctx.chatId);
  sessions.reset(ctx.chatId);
  const found = findVacancies(data);
  if (found.length === 0) {
    return ctx.reply('Подходящих вакансий пока нет 😔\nПопробуйте другую сферу или формат занятости.', {
      attachments: keyboards.menu('seeker'),
    });
  }
  return ctx.reply(format.vacanciesText(found), {
    attachments: keyboards.results(miniapp.vacanciesUrl(found), 'seeker'),
  });
}

// ---------- Меню и справка ----------
function showMenu(ctx, intro) {
  const role = roleOf(ctx);
  if (!role) return startFlow(ctx);
  const text = intro || 'Что делаем дальше?';
  return ctx.reply(text, { attachments: keyboards.menu(role) });
}

function showHelp(ctx, intro) {
  return ctx.reply(
    (intro ? `${intro}\n\n` : '') +
      'Foundee-Max помогает быстро закрыть сезонную или срочную вакансию.\n\n' +
      '💼 Работодатель отвечает на несколько вопросов — бот сохраняет вакансию и сразу показывает подходящих кандидатов.\n' +
      '🙋 Соискатель выбирает сферу, город и формат — бот показывает подходящие вакансии.\n\n' +
      'Команды:\n' +
      '/start — начать подбор\n' +
      '/my_vacancies — мои вакансии\n' +
      '/change_role — сменить роль\n' +
      '/help — эта справка\n\n' +
      'На любом шаге можно написать «заново», чтобы начать сначала.',
    { attachments: keyboards.menu(roleOf(ctx)) }
  );
}

module.exports = {
  STEPS,
  submitAnswer,
  repeatStep,
  startFlow,
  changeRole,
  showMyVacancies,
  matchVacancy,
  deleteVacancy,
  showMenu,
  showHelp,
};
