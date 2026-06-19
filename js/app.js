// =================================================================
// app.js : language switching, active nav, card hover spotlight, mobile menu
// =================================================================

(function () {
  const SUPPORTED = ['pt', 'en', 'es'];
  const STORAGE_KEY = 'larissa-portfolio-lang';

  function detectInitialLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language || 'pt').slice(0, 2);
    return SUPPORTED.includes(browser) ? browser : 'pt';
  }

  function applyLang(lang) {
    const dict = window.I18N[lang];
    if (!dict) return;

    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      // format: "attr:key,attr:key"
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (dict[key] !== undefined) el.setAttribute(attr, dict[key]);
      });
    });

    // Update switch buttons
    document.querySelectorAll('.lang-switch button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    localStorage.setItem(STORAGE_KEY, lang);
  }

  // -- Boot --------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const initial = detectInitialLang();
    applyLang(initial);

    // Language switch wiring
    document.querySelectorAll('.lang-switch button').forEach((btn) => {
      btn.addEventListener('click', () => applyLang(btn.dataset.lang));
    });

    // Card spotlight hover
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });

    // ---- Scroll reveal (fade/slide ao entrar na viewport) ----------
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced && 'IntersectionObserver' in window) {
      const revealSel = [
        '.section-header', '.intro-card', '.project', '.skill-group',
        '.tl-item', '.about-portrait', '.about-body', '.contact-card',
        '.stats-band', '.stat', '.case-study',
        '.studio-panel', '.studio-services', '.studio-stack',
      ].join(',');
      const targets = Array.from(document.querySelectorAll(revealSel));
      targets.forEach((el) => el.classList.add('reveal'));

      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--in');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

      targets.forEach((el) => io.observe(el));
    }

    // Active section in nav
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    const setActive = () => {
      let current = '';
      const pos = window.scrollY + 140;
      sections.forEach((s) => {
        if (s.offsetTop <= pos) current = s.id;
      });
      navLinks.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
    };
    window.addEventListener('scroll', setActive, { passive: true });
    setActive();

    // ---- Contact form -----------------------------------------------
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');

    const STATUS_TXT = {
      pt: {
        sending: 'enviando...',
        ok: 'Mensagem enviada! Respondo em até 24h.',
        invalid_name: 'Nome inválido.',
        invalid_email: 'Email inválido.',
        invalid_message: 'Mensagem muito curta (mín. 10 caracteres).',
        rate_limited: 'Muitas tentativas. Tente novamente em alguns minutos.',
        email_not_configured: 'Servidor de email não configurado.',
        email_send_failed: 'Falha ao enviar, tente o WhatsApp.',
        network: 'Sem conexão com o servidor.',
        generic: 'Algo deu errado. Tente novamente.',
      },
      en: {
        sending: 'sending...',
        ok: 'Message sent! I reply within 24h.',
        invalid_name: 'Invalid name.',
        invalid_email: 'Invalid email.',
        invalid_message: 'Message too short (min. 10 chars).',
        rate_limited: 'Too many attempts. Try again in a few minutes.',
        email_not_configured: 'Email server not configured.',
        email_send_failed: 'Failed to send, try WhatsApp.',
        network: 'No connection to server.',
        generic: 'Something went wrong. Try again.',
      },
      es: {
        sending: 'enviando...',
        ok: 'Mensaje enviado! Respondo en menos de 24h.',
        invalid_name: 'Nombre inválido.',
        invalid_email: 'Email inválido.',
        invalid_message: 'Mensaje muy corto (mín. 10 caracteres).',
        rate_limited: 'Demasiados intentos. Probá en unos minutos.',
        email_not_configured: 'Servidor de email no configurado.',
        email_send_failed: 'Fallo al enviar, probá por WhatsApp.',
        network: 'Sin conexión con el servidor.',
        generic: 'Algo salió mal. Intentá de nuevo.',
      },
    };

    function currentLang() {
      return document.documentElement.lang in STATUS_TXT
        ? document.documentElement.lang
        : 'pt';
    }
    function setStatus(text, kind) {
      if (!status) return;
      status.textContent = text;
      status.classList.remove('is-error', 'is-ok');
      if (kind) status.classList.add(`is-${kind}`);
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const txt = STATUS_TXT[currentLang()];
        const submitBtn = form.querySelector('button[type="submit"]');
        const data = Object.fromEntries(new FormData(form).entries());

        submitBtn.disabled = true;
        setStatus(txt.sending);

        try {
          const r = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const body = await r.json().catch(() => ({}));
          if (r.ok && body.ok) {
            setStatus(txt.ok, 'ok');
            form.reset();
          } else {
            const code = body.error || 'generic';
            setStatus(txt[code] || txt.generic, 'error');
          }
        } catch {
          setStatus(txt.network, 'error');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    // ---- Hero: nome interativo (split em letras) --------------------
    const nameEl = document.getElementById('hero-name');
    if (nameEl && !nameEl.dataset.split) {
      const text = nameEl.textContent;
      nameEl.textContent = '';
      for (const chr of text) {
        if (chr === ' ') {
          nameEl.appendChild(document.createTextNode(' '));
          continue;
        }
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = chr;
        nameEl.appendChild(s);
      }
      nameEl.dataset.split = '1';
    }

    // ---- Hero: foto interativa (tilt 3D) ----------------------------
    const portrait = document.getElementById('hero-portrait');
    if (portrait && !prefersReduced) {
      const MAX = 9; // graus
      portrait.addEventListener('pointermove', (e) => {
        const r = portrait.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        portrait.classList.add('is-tilting');
        portrait.style.transform =
          `perspective(900px) rotateY(${px * MAX * 2}deg) rotateX(${-py * MAX * 2}deg) scale(1.02)`;
      });
      portrait.addEventListener('pointerleave', () => {
        portrait.classList.remove('is-tilting');
        portrait.style.transform = '';
      });
    }

    // ---- Relógio em tempo real (BRT · America/Sao_Paulo) ------------
    const timeEl = document.getElementById('local-time');
    if (timeEl) {
      const fmt = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'America/Sao_Paulo',
      });
      const tick = () => { timeEl.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 1000);
    }

    // ---- Mobile nav toggle ------------------------------------------
    const nav = document.querySelector('.nav');
    const navToggle = document.querySelector('.nav-toggle');
    if (nav && navToggle) {
      const closeMenu = () => {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      };
      navToggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
      });
      // Fecha o menu ao clicar num link ou fora do nav
      nav.querySelectorAll('.nav-links a').forEach((a) =>
        a.addEventListener('click', closeMenu)
      );
      document.addEventListener('click', (e) => {
        if (nav.classList.contains('is-open') && !nav.contains(e.target)) closeMenu();
      });
    }
  });
})();
