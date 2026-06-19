// =================================================================
// terminal.js : efeito de digitação no terminal do hero
// Roda uma vez no load. Linhas de comando (.cmd) são digitadas
// caractere a caractere; linhas de saída (.out) aparecem em fade.
// Respeita prefers-reduced-motion e não interfere no i18n.
// =================================================================

(function () {
  const term = document.querySelector('.terminal');
  if (!term) return;

  const lines = Array.from(term.querySelectorAll('.terminal-body .line'));
  if (!lines.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cursor que acompanha a linha sendo digitada
  const existingCursor = term.querySelector('.terminal-cursor');

  // Snapshot do texto dos comandos ANTES de esconder (já traduzido pelo i18n)
  const cmdText = new Map();
  for (const line of lines) {
    const cmd = line.querySelector('.cmd');
    if (cmd) cmdText.set(cmd, cmd.textContent);
  }

  if (reduce) return; // sem animação: deixa tudo visível como veio do HTML/i18n

  // Esconde tudo e remove o cursor estático (vamos controlar um móvel)
  for (const line of lines) line.style.opacity = '0';
  if (existingCursor) existingCursor.style.display = 'none';

  const cursor = document.createElement('span');
  cursor.className = 'terminal-cursor';

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function typeCmd(cmdEl, text) {
    cmdEl.textContent = '';
    cmdEl.after(cursor); // cursor logo após o comando
    for (let i = 0; i < text.length; i++) {
      cmdEl.textContent += text[i];
      await wait(38 + Math.random() * 50);
    }
    await wait(140);
  }

  async function run() {
    for (const line of lines) {
      line.style.opacity = '1';
      const cmd = line.querySelector('.cmd');
      if (cmd) {
        await typeCmd(cmd, cmdText.get(cmd) || '');
      } else {
        await wait(90);
      }
    }
    // Cursor final piscando na última linha
    lines[lines.length - 1].appendChild(cursor);
  }

  // Espera o i18n inicial aplicar (app.js roda no mesmo DOMContentLoaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(run, 60));
  } else {
    setTimeout(run, 60);
  }
})();
