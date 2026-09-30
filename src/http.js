const fs = require('fs');
const tls = require('tls');
const { Agent, fetch: undiciFetch } = require('undici');

// API MAX (platform-api2.max.ru) подписан сертификатом Минцифры, которого нет в стандартном
// наборе Node.js. Добавляем его к системным корневым сертификатам, проверку TLS не отключаем.
function createFetch(caCertPath) {
  if (!fs.existsSync(caCertPath)) {
    console.warn(`⚠️ Сертификат Минцифры не найден (${caCertPath}), используется стандартный fetch.`);
    return globalThis.fetch;
  }

  const dispatcher = new Agent({
    connect: { ca: [...tls.rootCertificates, fs.readFileSync(caCertPath, 'utf-8')] },
  });

  return (url, options = {}) => undiciFetch(url, { ...options, dispatcher });
}

module.exports = { createFetch };
