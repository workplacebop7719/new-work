#!/usr/bin/env node
/**
 * Requests every route the browser smokes touch, twice, before they run.
 *
 * WHY. A dev server compiles a route on its FIRST request, which can take
 * several seconds. That is not the product being slow, but it is enough to
 * race a form submit — and it produced the worst kind of failure: a smoke that
 * failed on a cold server and passed on a re-run, so every run had to be
 * repeated before its result meant anything.
 *
 * Each script has its own `warm()` for the pages it uses. This exists because
 * `smoke:all` runs eleven of them and the third one down was still meeting
 * routes nothing had compiled yet.
 *
 * TWICE ON PURPOSE. The first pass triggers compilation; the second confirms
 * it finished, since the first response can return while work is still going
 * on behind it. The second pass is also what makes the timing report below
 * meaningful — anything still slow on the second pass is worth knowing about.
 *
 * This never fails the run. A route that will not warm is reported and left to
 * the smoke that actually tests it, which will say something far more useful
 * than "warm-up failed".
 */
const BASE = process.env.BASE || 'http://localhost:3210';

const ROUTES = [
  '/', '/today', '/search', '/categories', '/categories/shoes', '/stores',
  '/how-it-works', '/about', '/membership', '/privacy', '/terms', '/disclosures',
  '/contact', '/edit', '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/app/watchlist', '/app/saved', '/app/account', '/app/noticed',
  '/app/household', '/app/deal-signals', '/admin', '/api/session',
];

const get = async (path) => {
  const started = Date.now();
  try {
    await fetch(BASE + path, { redirect: 'manual' });
    return Date.now() - started;
  } catch {
    return null;
  }
};

for (const path of ROUTES) await get(path);

const slow = [];
for (const path of ROUTES) {
  const ms = await get(path);
  if (ms === null) slow.push(`${path} (unreachable)`);
  else if (ms > 2000) slow.push(`${path} (${ms}ms)`);
}

console.log(
  slow.length === 0
    ? `Warmed ${ROUTES.length} routes.`
    : `Warmed ${ROUTES.length} routes; still slow: ${slow.join(', ')}`,
);
