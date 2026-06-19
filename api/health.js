const { methodGuard } = require('./_lib/helpers');

module.exports = (req, res) => {
  if (!methodGuard(req, res, ['GET'])) return;
  res.status(200).json({
    ok: true,
    runtime: 'vercel-serverless',
    ts: new Date().toISOString(),
  });
};
