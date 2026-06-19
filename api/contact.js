// =================================================================
// POST /api/contact — Vercel serverless
// =================================================================

const { Resend } = require('resend');

const {
  methodGuard,
  rateLimit,
  getClientIp,
  tryLog,
  validateContact,
  escapeHtml,
} = require('./_lib/helpers');

let resendClient = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

module.exports = async (req, res) => {
  if (!methodGuard(req, res, ['POST'])) return;

  // Rate limit: 5 / 10 min por IP (best-effort por instância)
  const ip = getClientIp(req);
  const rl = rateLimit(`contact:${ip}`, { windowMs: 10 * 60_000, max: 5 });
  if (!rl.ok) {
    res.setHeader('Retry-After', Math.ceil(rl.resetIn / 1000));
    return res.status(429).json({ error: 'rate_limited' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { name, email, message, website } = body;

  // Honeypot: bot preencheu o campo escondido → finge sucesso e descarta
  if (website) return res.status(200).json({ ok: true });

  const err = validateContact({ name, email, message });
  if (err) return res.status(400).json({ error: err });

  const clean = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    message: message.trim(),
  };

  tryLog('contacts.jsonl', {
    ...clean,
    ip,
    ua: req.headers['user-agent'] || '',
  });

  const resend = getResend();
  if (!resend) {
    return res.status(503).json({ error: 'email_not_configured' });
  }
  const from = process.env.MAIL_FROM || 'Portfolio <onboarding@resend.dev>';
  const to = process.env.MAIL_TO;
  if (!to) return res.status(500).json({ error: 'email_not_configured' });

  const subject = `[Portfolio] Novo contato de ${clean.name}`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;color:#111;">
      <h2 style="margin:0 0 12px;">Novo contato pelo portfólio</h2>
      <p><strong>Nome:</strong> ${escapeHtml(clean.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(clean.email)}</p>
      <p><strong>Mensagem:</strong></p>
      <pre style="white-space:pre-wrap;background:#f6f6f8;padding:14px;border-radius:8px;">${escapeHtml(clean.message)}</pre>
    </div>`.trim();
  const text = `Novo contato pelo portfólio\n\nNome: ${clean.name}\nEmail: ${clean.email}\n\n${clean.message}`;

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: clean.email,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[contact] resend:', error);
      return res.status(502).json({ error: 'email_send_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[contact] crash:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
};
