const { Keyboard } = require('@maxhub/max-bot-api');
const { OPTIONS, buttonText } = require('./options');

// payload кнопок кодируется как "шаг:ключ", чтобы обработчик понимал,
// к какому вопросу относится нажатие, и мог отбросить устаревшие кнопки.
function choice(step, group = step) {
  const rows = OPTIONS[group].map((opt) => [Keyboard.button.callback(buttonText(opt), `${step}:${opt.key}`)]);
  return [Keyboard.inlineKeyboard(rows)];
}

function skip(step) {
  return [Keyboard.inlineKeyboard([[Keyboard.button.callback('Пропустить', `${step}:skip`)]])];
}

function menuRows(role) {
  const rows = [];
  if (role === 'employer') {
    rows.push([Keyboard.button.callback('➕ Новая вакансия', 'menu:new')]);
    rows.push([Keyboard.button.callback('📋 Мои вакансии', 'menu:my')]);
  } else if (role === 'seeker') {
    rows.push([Keyboard.button.callback('🔍 Новый поиск', 'menu:new')]);
  }
  rows.push([Keyboard.button.callback('🔁 Сменить роль', 'menu:role')]);
  return rows;
}

function menu(role) {
  return [Keyboard.inlineKeyboard(menuRows(role))];
}

function results(miniAppUrl, role) {
  return [
    Keyboard.inlineKeyboard([
      [Keyboard.button.openApp('📋 Открыть карточками', miniAppUrl)],
      ...menuRows(role),
    ]),
  ];
}

function myVacancies(list, role) {
  const rows = list.map((v) => [
    Keyboard.button.callback(`🔍 ${v.title}`, `vac_match:${v.id}`),
    Keyboard.button.callback('🗑 Удалить', `vac_del:${v.id}`),
  ]);
  return [Keyboard.inlineKeyboard([...rows, ...menuRows(role)])];
}

module.exports = { choice, skip, menu, results, myVacancies };
