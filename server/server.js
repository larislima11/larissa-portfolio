// =================================================================
// server.js — Express app: contato, CV tracking, GitHub repos
// =================================================================

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const contactRouter = require('./routes/contact');
const cvRouter = require('./routes/cv');
const githubRouter = require('./routes/github');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(__dirname, '..');

// ----- Trust proxy (necessário pro rate-limit ler IP real em Vercel/Render)
app.set('trust proxy', 1);

// ----- Segurança: Helmet (com CSP compatível com fontes Google + canvas inline)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", 'https://api.github.com'],
        'frame-ancestors': ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ----- CORS
const allowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin (servido pelo próprio Express) não envia origin → permite
      if (!origin) return cb(null, true);
      if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
  })
);

// ----- JSON com limite anti-DoS
app.use(express.json({ limit: '16kb' }));

// ----- Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ----- API routes
app.use('/api/contact', contactRouter);
app.use('/api/cv', cvRouter);
app.use('/api/github', githubRouter);

// ----- Frontend estático (HTML/CSS/JS do portfólio)
app.use(
  express.static(ROOT, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

// ----- 404 JSON pra /api/*; senão deixa o static cuidar
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

// ----- Error handler
app.use((err, _req, res, _next) => {
  console.error('[server] error:', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.publicMessage || 'internal_error' });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
