const { readJson } = require('./storage');
const vacancies = require('./vacancies');
const { MAX_RESULTS } = require('./options');

const candidates = readJson('candidates.json', []);

function sameCity(a, b) {
  if (!a || !b) return false;
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return x.includes(y) || y.includes(x);
}

// Обязательное условие — совпадение сферы. Остальные параметры дают баллы:
// город +3, формат занятости +2, срочность +1.
function rank(items, criteria) {
  return items
    .filter((item) => item.industry === criteria.industry)
    .map((item) => {
      let score = 0;
      if (sameCity(item.city, criteria.city)) score += 3;
      if (item.employment_type === criteria.employment_type) score += 2;
      if (criteria.availability && item.availability === criteria.availability) score += 1;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ item }) => item);
}

function findCandidates(criteria) {
  return rank(candidates, criteria);
}

function findVacancies(criteria) {
  return rank(vacancies.listAll(), criteria);
}

module.exports = { findCandidates, findVacancies };
