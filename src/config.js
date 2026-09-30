const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT_DIR = path.join(__dirname, '..');

function resolveFromRoot(value, fallback) {
  const target = value || fallback;
  return path.isAbsolute(target) ? target : path.join(ROOT_DIR, target);
}

const config = {
  botToken: process.env.BOT_TOKEN,
  miniAppUrl: process.env.MINIAPP_URL || 'https://max-miniapp-eight.vercel.app/',
  caCertPath: resolveFromRoot(process.env.CA_CERT_PATH, 'certs/russian_trusted_bundle.pem'),
  dataDir: resolveFromRoot(process.env.DATA_DIR, 'data'),
};

module.exports = config;
