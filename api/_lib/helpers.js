// =================================================================
// Helpers compartilhados entre as funções serverless.
// Underscore no nome do diretório evita que a Vercel exponha como rota.
// =================================================================

const fs = require('fs');
const path = require('path');

// ----- CORS / método -----------------------------------------------
function applyCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  if (origin && (allowed.length === 0 || allowed.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function methodGuard(req, res, allow) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (!allow.includes(req.method)) {
    res.setHeader('Allow', allow.join(', '));
    res.status(405).json({ error: 'method_not_allowed' });
    return false;
  }
  return true;
}

// ----- Rate limit em memória (best-effort por instância) -----------
// Em serverless, isto NÃO é um limite global — cada instância tem o
// seu próprio buffer. Para um limite distribuído real, plugar
// @upstash/ratelimit. Para anti-spam casual já segura bem.
const buckets = new Map();
function rateLimit(key, { windowMs, max }) {
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    ok: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
    resetIn: Math.max(0, bucket.reset - now),
  };
}

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// ----- Log JSONL em /tmp (efêmero em serverless) -------------------
// Em produção use um sink real (KV, Postgres, S3, Logflare).
function tryLog(filename, payload) {
  try {
    const dir = process.env.VERCEL ? '/tmp' : path.resolve(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...payload }) + '\n';
    fs.appendFileSync(path.join(dir, filename), line);
  } catch (err) {
    console.error('[log] failed:', err.message);
  }
}

// ----- Validação leve ----------------------------------------------
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validateContact({ name, email, message }) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 120) {
    return 'invalid_name';
  }
  if (typeof email !== 'string' || !EMAIL_RX.test(email) || email.length > 254) {
    return 'invalid_email';
  }
  if (typeof message !== 'string' || message.trim().length < 10 || message.length > 5000) {
    return 'invalid_message';
  }
  return null;
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  applyCors,
  methodGuard,
  rateLimit,
  getClientIp,
  tryLog,
  validateContact,
  escapeHtml,
};
