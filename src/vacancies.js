const crypto = require('crypto');
const { readJson, writeJson } = require('./storage');
const { MAX_VACANCIES_PER_USER } = require('./options');

const VACANCIES_FILE = 'vacancies.json';
const DEMO_VACANCIES_FILE = 'demo-vacancies.json';

// Демо-вакансии нужны, чтобы сценарий соискателя можно было проверить без работодателей.
function listDemo() {
  return readJson(DEMO_VACANCIES_FILE, []).map((v) => ({ ...v, demo: true }));
}

function listUserVacancies() {
  return readJson(VACANCIES_FILE, []);
}

function listAll() {
  return [...listUserVacancies(), ...listDemo()];
}

function listByOwner(ownerId) {
  return listUserVacancies().filter((v) => v.ownerId === ownerId);
}

function findById(id) {
  return listAll().find((v) => v.id === id) || null;
}

function canCreate(ownerId) {
  return listByOwner(ownerId).length < MAX_VACANCIES_PER_USER;
}

function create(ownerId, data) {
  const vacancies = listUserVacancies();
  if (vacancies.filter((v) => v.ownerId === ownerId).length >= MAX_VACANCIES_PER_USER) {
    return null;
  }
  const vacancy = {
    id: crypto.randomBytes(4).toString('hex'),
    ownerId,
    title: data.title,
    industry: data.industry,
    city: data.city,
    employment_type: data.employment_type,
    availability: data.availability,
    salary: data.salary || null,
    phone: data.phone,
    createdAt: new Date().toISOString(),
  };
  vacancies.push(vacancy);
  writeJson(VACANCIES_FILE, vacancies);
  return vacancy;
}

function remove(ownerId, id) {
  const vacancies = listUserVacancies();
  const rest = vacancies.filter((v) => !(v.id === id && v.ownerId === ownerId));
  if (rest.length === vacancies.length) return false;
  writeJson(VACANCIES_FILE, rest);
  return true;
}

module.exports = { listAll, listByOwner, findById, canCreate, create, remove };
