/**
 * Applies the rate limiter to server actions — question Q-27.
 *
 * The refusal is a plain page with plain words and a wait time. There is no
 * challenge, no puzzle and no "prove you are human" step, because ACC-005 and
 * PRD §27 make an inaccessible barrier the wrong answer to abuse.
 */
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { consume, type RateLimitedAction } from '@northstar/db';
import type { Locale } from './i18n';

/**
 * Best-effort client identifier.
 *
 * Behind a proxy the left-most `x-forwarded-for` entry is the client. That header
 * is spoofable by anyone talking to the origin directly, so this is a speed bump
 * against casual abuse rather than an authentication signal — which is all a
 * rate limit on an anonymous endpoint can ever be. The deployment must ensure
 * the origin is only reachable through the proxy for this to hold; recorded as a
 * deployment constraint in the threat model.
 */
async function clientIdentifier(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return h.get('x-real-ip') ?? 'unknown';
}

/**
 * Consumes one unit of budget, redirecting to an accessible refusal page when
 * exhausted.
 *
 * Fails **closed**: if the counter cannot be read or written, the request is
 * refused. An abuse control that stops working the moment the database is under
 * strain is a control that disappears exactly when it is needed.
 */
export async function enforceRateLimit(action: RateLimitedAction, locale: Locale): Promise<void> {
  let decision;
  try {
    decision = await consume(await clientIdentifier(), action);
  } catch (error) {
    console.error(JSON.stringify({ type: 'rate_limit_error', action, error: String(error) }));
    redirect(`/${locale}/too-many-requests`);
  }

  if (!decision.allowed) {
    redirect(`/${locale}/too-many-requests?retryAfter=${decision.retryAfterSeconds}`);
  }
}
