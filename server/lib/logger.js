// =================================================================
// logger.js — append-only JSON Lines em /data
// =================================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function appendJsonl(filename, payload) {
  ensureDir();
  const file = path.join(DATA_DIR, filename);
  const line = JSON.stringify({ ts: new Date().toISOString(), ...payload }) + '\n';
  fs.appendFile(file, line, (err) => {
    if (err) console.error(`[logger] failed to write ${filename}:`, err.message);
  });
}

module.exports = { appendJsonl };
