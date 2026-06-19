// =================================================================
// GET /api/cv/stats — total de downloads logados nesta instância
// (Em serverless o número é por-instância e zera em redeploy.)
// =================================================================

const fs = require('fs');
const path = require('path');

const { methodGuard } = require('./_lib/helpers');

module.exports = (req, res) => {
  if (!methodGuard(req, res, ['GET'])) return;
  const dir = process.env.VERCEL ? '/tmp' : path.resolve(process.cwd(), 'data');
  const file = path.join(dir, 'cv-downloads.jsonl');
  if (!fs.existsSync(file)) return res.status(200).json({ total: 0, scope: 'instance' });
  fs.readFile(file, 'utf8', (err, txt) => {
    if (err) return res.status(500).json({ error: 'read_failed' });
    const total = txt.split('\n').filter(Boolean).length;
    res.status(200).json({ total, scope: 'instance' });
  });
};
