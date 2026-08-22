/**
 * Visitor profile — PUB-002.
 *
 * "Selected profile persists with consent and changes relevant copy, content and
 * CTA **without hiding the general site**."
 *
 * Two things follow from that last clause and shape this module:
 *
 *  1. The profile is a *functional preference*, not an analytics identity. It is
 *     stored in a first-party essential cookie with a stated purpose, and it is
 *     never used to identify a visitor across sessions (ADR-0007). Choosing a
 *     size band is not consent to be tracked.
 *  2. Nothing is ever removed from the page because of it. Personalization here
 *     re-orders and annotates; the general content stays reachable. A visitor
 *     who picks the wrong band must not have to discover that they were shown
 *     less than someone else.
 */
import { cookies } from 'next/headers';
import { EMPLOYEE_BANDS, type EmployeeBand } from '@northstar/domain';

const PROFILE_COOKIE = 'ns_profile_band';

export function isEmployeeBand(value: string): value is EmployeeBand {
  return (EMPLOYEE_BANDS as readonly string[]).includes(value);
}

export async function readBand(): Promise<EmployeeBand | undefined> {
  const value = (await cookies()).get(PROFILE_COOKIE)?.value;
  return value && isEmployeeBand(value) ? value : undefined;
}

export async function writeBand(band: EmployeeBand): Promise<void> {
  (await cookies()).set(PROFILE_COOKIE, band, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
    // A year. It is a preference, not a session — and re-asking someone their
    // organization's size every visit is the kind of small rudeness that adds up.
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearBand(): Promise<void> {
  (await cookies()).delete(PROFILE_COOKIE);
}
