const OPTIONS = {
  role: [
    { key: 'employer', label: 'Я работодатель', emoji: '💼' },
    { key: 'seeker', label: 'Я ищу работу', emoji: '🙋' },
  ],
  industry: [
    { key: 'retail', label: 'Розница/торговля', emoji: '🛒' },
    { key: 'horeca', label: 'Общепит (кафе/рестораны)', emoji: '☕️' },
    { key: 'agro', label: 'АПК/сезонные работы', emoji: '🌾' },
    { key: 'other', label: 'Другое' },
  ],
  employment: [
    { key: 'full', label: 'Полная занятость' },
    { key: 'part', label: 'Частичная занятость' },
    { key: 'shift', label: 'Подработка/разовая' },
  ],
  availability: [
    { key: 'urgent', label: 'Сегодня-завтра', emoji: '🔥' },
    { key: 'week', label: 'В течение недели' },
    { key: 'flexible', label: 'Не горит' },
  ],
};

const MAX_VACANCIES_PER_USER = 3;
const MAX_RESULTS = 3;

function isValidKey(group, key) {
  return OPTIONS[group].some((opt) => opt.key === key);
}

function labelOf(group, key) {
  const option = OPTIONS[group].find((opt) => opt.key === key);
  return option ? option.label : key;
}

function buttonText(option) {
  return option.emoji ? `${option.emoji} ${option.label}` : option.label;
}

module.exports = { OPTIONS, MAX_VACANCIES_PER_USER, MAX_RESULTS, isValidKey, labelOf, buttonText };
