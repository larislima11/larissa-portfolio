// =================================================================
// email.js — wrapper do Resend
// =================================================================

const { Resend } = require('resend');

let client = null;
function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendContactEmail({ name, email, message }) {
  const resend = getClient();
  if (!resend) {
    throw Object.assign(new Error('email_not_configured'), {
      status: 503,
      publicMessage: 'email_not_configured',
    });
  }

  const from = process.env.MAIL_FROM || 'Portfolio <onboarding@resend.dev>';
  const to = process.env.MAIL_TO;
  if (!to) {
    throw Object.assign(new Error('MAIL_TO missing'), {
      status: 500,
      publicMessage: 'email_not_configured',
    });
  }

  const subject = `[Portfolio] Novo contato de ${name}`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; color: #111;">
      <h2 style="margin:0 0 12px;">Novo contato pelo portfólio</h2>
      <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Mensagem:</strong></p>
      <pre style="white-space:pre-wrap; background:#f6f6f8; padding:14px; border-radius:8px;">${escapeHtml(message)}</pre>
    </div>
  `.trim();
  const text = `Novo contato pelo portfólio\n\nNome: ${name}\nEmail: ${email}\n\nMensagem:\n${message}`;

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject,
    html,
    text,
  });

  if (error) {
    console.error('[email] resend error:', error);
    throw Object.assign(new Error('email_send_failed'), {
      status: 502,
      publicMessage: 'email_send_failed',
    });
  }
  return data;
}

module.exports = { sendContactEmail };
