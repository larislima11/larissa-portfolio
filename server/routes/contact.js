// =================================================================
// POST /api/contact — recebe mensagem do form, valida, loga, envia
// =================================================================

const express = require('express');
const validator = require('validator');
const rateLimit = require('express-rate-limit');

const { sendContactEmail } = require('../lib/email');
const { appendJsonl } = require('../lib/logger');

const router = express.Router();

// 5 envios por IP a cada 10 min
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

router.post('/', limiter, async (req, res, next) => {
  try {
    const { name, email, message, website } = req.body || {};

    // Honeypot: bots costumam preencher campos escondidos
    if (website) {
      // Finge sucesso pra não dar feedback ao bot
      return res.json({ ok: true });
    }

    // Validação
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 120) {
      return res.status(400).json({ error: 'invalid_name' });
    }
    if (typeof email !== 'string' || !validator.isEmail(email) || email.length > 254) {
      return res.status(400).json({ error: 'invalid_email' });
    }
    if (typeof message !== 'string' || message.trim().length < 10 || message.length > 5000) {
      return res.status(400).json({ error: 'invalid_message' });
    }

    const clean = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
    };

    // Log local (backup caso o email falhe)
    appendJsonl('contacts.jsonl', {
      ...clean,
      ip: req.ip,
      ua: req.get('user-agent') || '',
    });

    await sendContactEmail(clean);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
