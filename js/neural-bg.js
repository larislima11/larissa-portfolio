// =================================================================
// neural-bg.js : interactive neural network background
// Nodes drift, connect to neighbors, lit up by cursor proximity.
// =================================================================

(function () {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let nodes = [];
  const mouse = { x: -9999, y: -9999, active: false };
  const settings = {
    density: 0.000055,   // nodes per pixel
    maxLink: 150,        // px to connect
    cursorRadius: 180,
    cursorLink: 220,
    baseSpeed: 0.18,
  };

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const count = Math.max(40, Math.min(110, Math.floor(W * H * settings.density)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * settings.baseSpeed,
      vy: (Math.random() - 0.5) * settings.baseSpeed,
      r: 1 + Math.random() * 1.6,
      pulse: Math.random() * Math.PI * 2,
    }));
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    // Update
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -20) n.x = W + 20;
      if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20;
      if (n.y > H + 20) n.y = -20;

      // Cursor attraction (subtle)
      if (mouse.active) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < settings.cursorRadius * settings.cursorRadius) {
          const f = 0.0008;
          n.vx += dx * f;
          n.vy += dy * f;
        }
      }
      // Velocity damping
      n.vx = Math.max(-0.6, Math.min(0.6, n.vx * 0.985));
      n.vy = Math.max(-0.6, Math.min(0.6, n.vy * 0.985));
      n.pulse += 0.015;
    }

    // Draw links (node ↔ node)
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < settings.maxLink * settings.maxLink) {
          const d = Math.sqrt(d2);
          const alpha = (1 - d / settings.maxLink) * 0.22;
          // Blend purple→blue along the segment
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, `rgba(168, 85, 247, ${alpha})`);
          grad.addColorStop(1, `rgba(59, 130, 246, ${alpha})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Draw cursor links (brighter)
    if (mouse.active) {
      for (const n of nodes) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < settings.cursorLink * settings.cursorLink) {
          const d = Math.sqrt(d2);
          const alpha = (1 - d / settings.cursorLink) * 0.75;
          const grad = ctx.createLinearGradient(mouse.x, mouse.y, n.x, n.y);
          grad.addColorStop(0, `rgba(196, 132, 252, ${alpha})`);
          grad.addColorStop(1, `rgba(96, 165, 250, ${alpha * 0.7})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
      // Cursor halo
      const halo = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90);
      halo.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
      halo.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 90, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw nodes
    for (const n of nodes) {
      const pulse = 0.55 + 0.45 * Math.sin(n.pulse);
      // Glow
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6);
      glow.addColorStop(0, `rgba(196, 132, 252, ${0.5 * pulse})`);
      glow.addColorStop(1, 'rgba(196, 132, 252, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 6, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = `rgba(233, 213, 255, ${0.85 * pulse + 0.15})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  // Pointer tracking
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });
  window.addEventListener('mouseleave', () => { mouse.active = false; });
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
      mouse.active = true;
    }
  }, { passive: true });
  window.addEventListener('touchend', () => { mouse.active = false; });

  // Click : burst
  window.addEventListener('click', (e) => {
    for (const n of nodes) {
      const dx = n.x - e.clientX;
      const dy = n.y - e.clientY;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 320) {
        const f = (1 - d / 320) * 3.5;
        n.vx += (dx / d) * f;
        n.vy += (dy / d) * f;
      }
    }
  });

  window.addEventListener('resize', resize);
  resize();
  step();
})();
