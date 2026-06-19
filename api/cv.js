// =================================================================
// GET /api/cv — registra download e devolve o PDF
// =================================================================

const fs = require('fs');
const path = require('path');

const { methodGuard, rateLimit, getClientIp, tryLog } = require('./_lib/helpers');

const CV_PATH = path.resolve(process.cwd(), 'assets', 'CV_Larissa_Lima_de_Almeida.pdf');

module.exports = (req, res) => {
  if (!methodGuard(req, res, ['GET'])) return;

  const ip = getClientIp(req);
  const rl = rateLimit(`cv:${ip}`, { windowMs: 60 * 60_000, max: 30 });
  if (!rl.ok) {
    res.setHeader('Retry-After', Math.ceil(rl.resetIn / 1000));
    return res.status(429).json({ error: 'rate_limited' });
  }

  if (!fs.existsSync(CV_PATH)) {
    return res.status(404).json({ error: 'cv_not_found' });
  }

  tryLog('cv-downloads.jsonl', {
    ip,
    ua: req.headers['user-agent'] || '',
    referer: req.headers.referer || '',
  });

  const stat = fs.statSync(CV_PATH);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', stat.size);
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="CV_Larissa_Lima_de_Almeida.pdf"'
  );
  fs.createReadStream(CV_PATH).pipe(res);
};
