const { labelOf } = require('./options');

const NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

function ageWord(age) {
  const last = age % 10;
  const lastTwo = age % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'лет';
  if (last === 1) return 'год';
  if (last >= 2 && last <= 4) return 'года';
  return 'лет';
}

function candidatesText(list) {
  const lines = list.map(
    (c, i) =>
      `${NUMBERS[i]} ${c.name}, ${c.age} ${ageWord(c.age)} — ${c.experience}\n` +
      `📍 ${c.city} · ${labelOf('employment', c.employment_type)}\n📞 ${c.phone}`
  );
  return `Нашёл подходящих кандидатов:\n\n${lines.join('\n\n')}\n\nℹ️ Кандидаты — тестовые данные MVP.`;
}

function vacancyLine(v) {
  const salary = v.salary ? ` · 💰 ${v.salary}` : '';
  return `${v.title}\n📍 ${v.city} · ${labelOf('employment', v.employment_type)}${salary}`;
}

function vacanciesText(list) {
  const lines = list.map((v, i) => `${NUMBERS[i]} ${vacancyLine(v)}\n📞 ${v.phone}${v.demo ? ' · демо' : ''}`);
  return `Нашёл подходящие вакансии:\n\n${lines.join('\n\n')}\n\nℹ️ Вакансии с пометкой «демо» — тестовые данные MVP.`;
}

function vacancySummary(v) {
  return (
    `${v.title}\n` +
    `Сфера: ${labelOf('industry', v.industry)}\n` +
    `Город: ${v.city}\n` +
    `Занятость: ${labelOf('employment', v.employment_type)}\n` +
    `Срочность: ${labelOf('availability', v.availability)}\n` +
    `Зарплата: ${v.salary || 'не указана'}\n` +
    `Контакт: ${v.phone}`
  );
}

module.exports = { candidatesText, vacanciesText, vacancyLine, vacancySummary };
