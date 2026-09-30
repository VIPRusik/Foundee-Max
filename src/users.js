const { readJson, writeJson } = require('./storage');

const USERS_FILE = 'users.json';

function getUser(userId) {
  return readJson(USERS_FILE, {})[userId] || {};
}

function updateUser(userId, patch) {
  const users = readJson(USERS_FILE, {});
  users[userId] = { ...users[userId], ...patch, updatedAt: new Date().toISOString() };
  writeJson(USERS_FILE, users);
  return users[userId];
}

function setRole(userId, role) {
  return updateUser(userId, { role });
}

function clearRole(userId) {
  return updateUser(userId, { role: null });
}

function setPhone(userId, phone) {
  return updateUser(userId, { phone });
}

module.exports = { getUser, setRole, clearRole, setPhone };
