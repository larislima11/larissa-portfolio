// =================================================================
// GET /api/github/repos — lista repos públicos com cache em memória
// =================================================================

const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
let cache = { ts: 0, data: null, user: null };

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/repos', limiter, async (_req, res, next) => {
  try {
    const username = process.env.GITHUB_USERNAME;
    if (!username) {
      return res.status(503).json({ error: 'github_not_configured' });
    }

    const fresh = cache.user === username && Date.now() - cache.ts < CACHE_TTL_MS;
    if (fresh && cache.data) {
      return res.json({ cached: true, repos: cache.data });
    }

    const url = `https://api.github.com/users/${encodeURIComponent(
      username
    )}/repos?per_page=30&sort=updated`;

    const ghRes = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `larilima-portfolio/${username}`,
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
    res.json({ cached: false, repos });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
