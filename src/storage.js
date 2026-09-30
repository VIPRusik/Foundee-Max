const fs = require('fs');
const path = require('path');
const { dataDir } = require('./config');

function dataPath(fileName) {
  return path.join(dataDir, fileName);
}

function readJson(fileName, fallback) {
  const file = dataPath(fileName);
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf-8').trim();
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Ошибка чтения ${fileName}:`, error.message);
    return fallback;
  }
}

// Пишем во временный файл и переименовываем, чтобы при сбое не остался обрезанный JSON.
function writeJson(fileName, data) {
  const file = dataPath(fileName);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

module.exports = { readJson, writeJson };
