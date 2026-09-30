// Состояние диалога хранится в памяти процесса: после перезапуска бота
// незавершённый опрос начинается заново, сохранённые роли и вакансии не теряются.
const sessions = new Map();

function get(chatId) {
  if (!sessions.has(chatId)) sessions.set(chatId, { step: 'idle', data: {} });
  return sessions.get(chatId);
}

function reset(chatId, step = 'idle', data = {}) {
  const session = { step, data };
  sessions.set(chatId, session);
  return session;
}

module.exports = { get, reset };
