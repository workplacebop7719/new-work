import { createHmac, randomBytes } from 'node:crypto';

/**
 * THE APPLICATION'S SIGNING KEY (PRD §69).
 *
 * One secret, used through this module, with a LABEL per purpose. Domain
 * separation matters: without it, a value hashed for one feature would produce
 * the same token as the same value hashed for another, so a rate-limit token
 * and a challenge signature could be compared against each other and linked.
 *
 * With APP_SECRET set, derived tokens survive a restart and agree across every
 * instance. Without it a per-process key is generated: everything still works,
 * it just stops being consistent across a restart or a second instance —
 * correct for development, wrong for production, so `appSecretConfigured`
 * reports which is in use rather than leaving anybody guessing.
 *
 * CHALLENGE_SECRET is still read, because that is what this was called when
 * only the bot challenge used it.
 */

/** Shorter than this is not worth having, so it is treated as unset. */
export const MIN_SECRET_LENGTH = 16;

let ephemeral: Buffer | undefined;

function configuredSecret(): string | undefined {
  for (const value of [process.env.APP_SECRET, process.env.CHALLENGE_SECRET]) {
    if (value && value.length >= MIN_SECRET_LENGTH) return value;
  }
  return undefined;
}

function key(): Buffer {
  const configured = configuredSecret();
  if (configured) return Buffer.from(configured, 'utf8');
  ephemeral ??= randomBytes(32);
  return ephemeral;
}

export const appSecretConfigured = (): boolean => configuredSecret() !== undefined;

/**
 * A keyed, one-way token for a value we must recognise again but must not
 * store.
 *
 * The label is not decoration. An unlabelled hash of an IP address is
 * effectively reversible — IPv4 is four billion candidates, which is seconds
 * of work — so what makes this safe is the KEY, and what makes it safe across
 * features is that the same input under two labels gives two unrelated
 * tokens.
 */
export function token(label: string, value: string): string {
  return createHmac('sha256', key()).update(`${label} ${value}`).digest('hex');
}
