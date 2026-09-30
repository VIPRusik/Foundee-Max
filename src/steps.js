const users = require('./users');

function textBetween(min, max) {
  return (text) => (text.length >= min && text.length <= max ? text : null);
}

function city(text) {
  return text.length >= 2 && text.length <= 50 && /\p{L}/u.test(text) ? text : null;
}

function phone(text) {
  let digits = text.replace(/\D/g, '');
  if (digits.length === 11 && /^[78]/.test(digits)) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

// Описание шагов опроса. Шаг с `group` отвечает кнопками из OPTIONS[group],
// остальные — текстом, который проверяет `validate`. `next` — имя следующего шага
// или одно из финальных действий: 'employer_done', 'seeker_done'.
const STEPS = {
  role: {
    group: 'role',
    prompt: 'Кто вы?',
  },

  industry: {
    group: 'industry',
    field: 'industry',
    prompt: 'В какой сфере вакансия?',
    next: 'title',
  },
  title: {
    field: 'title',
    prompt: 'Кого ищете? Напишите должность, например: бариста, продавец-кассир, сборщик урожая.',
    error: 'Напишите должность текстом, от 2 до 40 символов. Например: бариста',
    validate: textBetween(2, 40),
    next: 'city',
  },
  city: {
    field: 'city',
    prompt: 'В каком городе или районе?',
    error: 'Напишите название города текстом, например: Москва',
    validate: city,
    next: 'employment',
  },
  employment: {
    group: 'employment',
    field: 'employment_type',
    prompt: 'Какой формат занятости?',
    next: 'availability',
  },
  availability: {
    group: 'availability',
    field: 'availability',
    prompt: 'Насколько срочно нужен человек?',
    next: 'salary',
  },
  salary: {
    field: 'salary',
    skippable: true,
    prompt: 'Какую оплату предлагаете? Например: 3000 ₽/смена или 60 000 ₽/мес.',
    error: 'Напишите оплату короче — до 40 символов, или нажмите «Пропустить».',
    validate: textBetween(1, 40),
    next: (userId) => (users.getUser(userId).phone ? 'employer_done' : 'phone'),
  },
  phone: {
    field: 'phone',
    prompt: 'Телефон для связи — его увидят соискатели, которым подойдёт вакансия. Например: +7 900 123-45-67',
    error: 'Не похоже на российский номер. Напишите 10–11 цифр, например: +7 900 123-45-67',
    validate: phone,
    next: 'employer_done',
  },

  seeker_industry: {
    group: 'industry',
    field: 'industry',
    prompt: 'В какой сфере ищете работу?',
    next: 'seeker_city',
  },
  seeker_city: {
    field: 'city',
    prompt: 'В каком городе ищете работу?',
    error: 'Напишите название города текстом, например: Москва',
    validate: city,
    next: 'seeker_employment',
  },
  seeker_employment: {
    group: 'employment',
    field: 'employment_type',
    prompt: 'Какой формат занятости вам подходит?',
    next: 'seeker_done',
  },
};

module.exports = { STEPS };
