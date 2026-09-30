const { miniAppUrl } = require('./config');
const { labelOf } = require('./options');

// Мини-приложение статично и не имеет своего API, поэтому бот передаёт ему
// найденные карточки в параметре ссылки: JSON с короткими ключами в base64url.
function encode(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

function buildUrl(payload) {
  const url = new URL(miniAppUrl);
  url.searchParams.set('data', encode(payload));
  return url.toString();
}

function candidatesUrl(candidates) {
  return buildUrl({
    kind: 'candidates',
    items: candidates.map((c) => ({
      n: c.name,
      a: c.age,
      e: c.experience,
      c: c.city,
      m: labelOf('employment', c.employment_type),
      p: c.phone,
    })),
  });
}

function vacanciesUrl(vacancies) {
  return buildUrl({
    kind: 'vacancies',
    items: vacancies.map((v) => ({
      t: v.title,
      c: v.city,
      m: labelOf('employment', v.employment_type),
      s: v.salary || '',
      p: v.phone,
      d: v.demo ? 1 : 0,
    })),
  });
}

module.exports = { candidatesUrl, vacanciesUrl };
