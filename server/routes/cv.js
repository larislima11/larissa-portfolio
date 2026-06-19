// =================================================================
// GET /api/cv — registra download (timestamp, IP, UA) e serve o PDF
// GET /api/cv/stats — retorna contagem total (uso interno/admin)
// =================================================================

const fs = require('fs');
const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');

const { appendJsonl } = require('../lib/logger');

const router = express.Router();

const CV_PATH = path.resolve(__dirname, '..', '..', 'assets', 'CV_Larissa_Lima_de_Almeida.pdf');
const STATS_PATH = path.resolve(__dirname, '..', '..', 'data', 'cv-downloads.jsonl');

// 30 downloads por IP por hora — generoso, mas evita scraping
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', limiter, (req, res, next) => {
  if (!fs.existsSync(CV_PATH)) {
    return res.status(404).json({ error: 'cv_not_found' });
  }

  appendJsonl('cv-downloads.jsonl', {
    ip: req.ip,
    ua: req.get('user-agent') || '',
    referer: req.get('referer') || '',
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="CV_Larissa_Lima_de_Almeida.pdf"'
  );
  res.sendFile(CV_PATH, (err) => {
    if (err) next(err);
  });
});

router.get('/stats', (_req, res) => {
  if (!fs.existsSync(STATS_PATH)) return res.json({ total: 0 });
  fs.readFile(STATS_PATH, 'utf8', (err, txt) => {
    if (err) return res.status(500).json({ error: 'read_failed' });
    const total = txt.split('\n').filter(Boolean).length;
    res.json({ total });
  });
});

module.exports = router;
