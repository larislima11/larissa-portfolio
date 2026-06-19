// =================================================================
// GET /api/github/repos — lista repos públicos, cache em memória.
// O cache é por-instância: cold starts revalidam.
// =================================================================

const { methodGuard, rateLimit, getClientIp } = require('./_lib/helpers');

const CACHE_TTL_MS = 10 * 60_000;
let cache = { ts: 0, data: null, user: null };

module.exports = async (req, res) => {
  if (!methodGuard(req, res, ['GET'])) return;

  const ip = getClientIp(req);
  const rl = rateLimit(`gh:${ip}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    res.setHeader('Retry-After', Math.ceil(rl.resetIn / 1000));
    return res.status(429).json({ error: 'rate_limited' });
  }

  const username = process.env.GITHUB_USERNAME;
  if (!username) return res.status(503).json({ error: 'github_not_configured' });

  const fresh = cache.user === username && Date.now() - cache.ts < CACHE_TTL_MS;
  if (fresh && cache.data) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json({ cached: true, repos: cache.data });
  }

  const url = `https://api.github.com/users/${encodeURIComponent(
    username
  )}/repos?per_page=30&sort=updated`;

  try {
    const ghRes = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `larilima-portfolio/${username}`,
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    });
    if (!ghRes.ok) {
      const status = ghRes.status === 404 ? 404 : 502;
      return res.status(status).json({ error: 'github_fetch_failed', status: ghRes.status });
    }
    const raw = await ghRes.json();
    const repos = raw
      .filter((r) => !r.fork && !r.private)
      .map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        homepage: r.homepage,
        language: r.language,
        stars: r.stargazers_count,
        topics: r.topics || [],
        updated_at: r.updated_at,
      }))
      .sort((a, b) => b.stars - a.stars || (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, 12);

    cache = { ts: Date.now(), data: repos, user: username };
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json({ cached: false, repos });
  } catch (e) {
    console.error('[gh] crash:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
};
