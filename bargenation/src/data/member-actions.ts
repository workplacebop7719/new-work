'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { readSession } from '@/auth/session';
import { loginHref } from '@/auth/return-url';
import * as member from './member-repository';
import type { MemberActionState } from './member-action-state';
import { DEFAULT_QUIET_HOURS, isUsableTimeZone } from '@/domain/quiet-hours';
import { CATEGORIES } from '@/domain/types';

/**
 * Member mutations (PRD §25, §27, §31).
 *
 * Every action re-reads the session server-side. It never accepts a profile id
 * from the client — the caller's identity comes from their cookie, so a
 * forged form field cannot act on somebody else's account. Row level security
 * is the backstop underneath that.
 *
 * When a logged-out visitor triggers one of these, we send them to sign in
 * with their original destination remembered rather than dropping them on the
 * homepage (§31).
 */

/**
 * These actions used to return void. Pressing Save then did the right thing in
 * the database and NOTHING visible on screen — the deal page is statically
 * rendered, so it has no session at build time and cannot show "saved" itself.
 * A control that works silently is indistinguishable from one that is broken,
 * and people press it again.
 *
 * The state type and its idle value live in member-action-state.ts, because a
 * `'use server'` file may only export async functions.
 */
const ok = (notice: string): MemberActionState => ({ error: null, notice });
const failed = (error: string): MemberActionState => ({ error, notice: null });

async function requireProfileId(returnTo: string): Promise<string> {
  const session = await readSession();
  if (!session) redirect(loginHref(returnTo));
  return session.user.id;
}

export async function saveOfferAction(
  _prev: MemberActionState, formData: FormData,
): Promise<MemberActionState> {
  const offerId = String(formData.get('offerId') ?? '');
  const returnTo = String(formData.get('returnTo') ?? '/today');
  const profileId = await requireProfileId(returnTo);

  await member.save(profileId, offerId);
  revalidatePath(returnTo);
  revalidatePath('/app/saved');
  // Says "it is saved", not "it has been saved", because the action is
  // idempotent: pressing twice is harmless and the second press should read
  // as confirmation rather than as a second save.
  return ok('Saved. It’s in your Saved list.');
}

export async function unsaveOfferAction(formData: FormData): Promise<void> {
  const offerId = String(formData.get('offerId') ?? '');
  const returnTo = String(formData.get('returnTo') ?? '/app/saved');
  const profileId = await requireProfileId(returnTo);

  await member.unsave(profileId, offerId);
  revalidatePath(returnTo);
  revalidatePath('/app/saved');
}

export async function watchProductAction(
  _prev: MemberActionState, formData: FormData,
): Promise<MemberActionState> {
  const slug = String(formData.get('productSlug') ?? '');
  const returnTo = String(formData.get('returnTo') ?? '/today');
  const rawTarget = String(formData.get('targetPrice') ?? '').trim();
  const profileId = await requireProfileId(returnTo);

  // A target price is optional; a nonsense one is dropped rather than stored.
  const dollars = rawTarget === '' ? null : Number(rawTarget);
  const targetPriceCents =
    dollars !== null && Number.isFinite(dollars) && dollars > 0
      ? Math.round(dollars * 100)
      : null;

  // Typed something that is not a price? Say so. Silently ignoring it means
  // somebody waits forever for an alert at a threshold we never stored.
  if (rawTarget !== '' && targetPriceCents === null) {
    return failed('That target price didn’t look like a number, so nothing was saved.');
  }

  await member.watchProduct(profileId, slug, { targetPriceCents });
  revalidatePath(returnTo);
  revalidatePath('/app/watchlist');

  return ok(
    targetPriceCents === null
      ? 'Watching. We’ll tell you when something actually changes.'
      : `Watching. We’ll tell you if it drops below ${(targetPriceCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
  );
}

export async function watchRetailerAction(
  _prev: MemberActionState, formData: FormData,
): Promise<MemberActionState> {
  const slug = String(formData.get('retailerSlug') ?? '');
  const returnTo = String(formData.get('returnTo') ?? '/stores');
  const profileId = await requireProfileId(returnTo);

  await member.watchRetailer(profileId, slug);
  revalidatePath(returnTo);
  revalidatePath('/app/watchlist');
  return ok('Watching this retailer. We’ll tell you when something here is worth buying.');
}

export async function unwatchAction(formData: FormData): Promise<void> {
  const itemId = String(formData.get('itemId') ?? '');
  const profileId = await requireProfileId('/app/watchlist');
  await member.unwatch(profileId, itemId);
  revalidatePath('/app/watchlist');
}

export async function toggleWatchPausedAction(formData: FormData): Promise<void> {
  const itemId = String(formData.get('itemId') ?? '');
  const paused = String(formData.get('paused') ?? '') === 'true';
  const profileId = await requireProfileId('/app/watchlist');
  await member.setWatchPaused(profileId, itemId, !paused);
  revalidatePath('/app/watchlist');
}

/* ============================================================
   INTEREST (§26, §37)
   ============================================================ */

/**
 * Records that a signed-in, consenting customer looked at something.
 *
 * Silently does nothing for everybody else — an anonymous visitor, or a
 * customer who has not turned this on. Deliberately NOT a redirect to sign in
 * like the other actions: this is not something anybody asked to do, so
 * interrupting a page view with a login prompt would be absurd.
 */
export async function noteInterestAction(productSlug: string): Promise<void> {
  if (!member.memberFeaturesAvailable) return;
  const session = await readSession();
  if (!session) return;
  if (typeof productSlug !== 'string' || productSlug.length === 0) return;

  await member.recordInterest(session.user.id, { productSlug }, 'VIEWED');
}

/**
 * The same, for one of the eight fixed categories.
 *
 * A separate action rather than a `kind` parameter on the one above, because
 * the argument means something different and the validation is different: this
 * one is checked against `CATEGORIES` before it reaches the database, so
 * nothing but a known slug can ever be written. Free text — a raw search
 * term — must never arrive here, and the narrow signature is what makes that
 * true rather than remembered.
 */
export async function noteCategoryInterestAction(categorySlug: string): Promise<void> {
  if (!member.memberFeaturesAvailable) return;
  const session = await readSession();
  if (!session) return;
  if (!CATEGORIES.some((c) => c.slug === categorySlug)) return;

  await member.recordInterest(session.user.id, { categorySlug }, 'VIEWED');
}

export async function setBehaviourAlertsAction(formData: FormData): Promise<void> {
  const enabled = String(formData.get('enabled') ?? '') === 'true';
  const profileId = await requireProfileId('/app/noticed');
  await member.setBehaviourAlerts(profileId, enabled);
  revalidatePath('/app/noticed');
  revalidatePath('/app/account');
}

export async function clearInterestsAction(): Promise<void> {
  const profileId = await requireProfileId('/app/noticed');
  await member.clearInterests(profileId);
  revalidatePath('/app/noticed');
}

/* ============================================================
   HOUSEHOLD (§35)
   ============================================================ */

const memberInput = (formData: FormData) => ({
  nickname: String(formData.get('nickname') ?? ''),
  birthYear: String(formData.get('birthYear') ?? ''),
  clothingSize: String(formData.get('clothingSize') ?? ''),
  shoeSize: String(formData.get('shoeSize') ?? ''),
});

export async function addHouseholdMemberAction(formData: FormData): Promise<void> {
  const profileId = await requireProfileId('/app/household');
  await member.addHouseholdMember(profileId, memberInput(formData));
  revalidatePath('/app/household');
  revalidatePath('/app/watchlist');
}

export async function updateHouseholdMemberAction(formData: FormData): Promise<void> {
  const memberId = String(formData.get('memberId') ?? '');
  const profileId = await requireProfileId('/app/household');
  await member.updateHouseholdMember(profileId, memberId, memberInput(formData));
  revalidatePath('/app/household');
  revalidatePath('/app/watchlist');
}

export async function removeHouseholdMemberAction(formData: FormData): Promise<void> {
  const memberId = String(formData.get('memberId') ?? '');
  const profileId = await requireProfileId('/app/household');
  await member.removeHouseholdMember(profileId, memberId);
  revalidatePath('/app/household');
  revalidatePath('/app/watchlist');
}

/** An empty selection means "nobody in particular", not "leave it alone". */
export async function setWatchForAction(formData: FormData): Promise<void> {
  const itemId = String(formData.get('itemId') ?? '');
  const raw = String(formData.get('memberId') ?? '');
  const profileId = await requireProfileId('/app/watchlist');
  await member.setWatchFor(profileId, itemId, raw === '' ? null : raw);
  revalidatePath('/app/watchlist');
}

/* ============================================================
   QUIET HOURS (§36)
   ============================================================ */

/**
 * Quiet hours DEFER delivery; they never suppress a signal.
 *
 * Turning them on does not mean you stop being told what happened — the
 * portal shows everything either way. It means nothing leaves the building
 * while you are asleep.
 */
export async function setQuietHoursAction(formData: FormData): Promise<void> {
  const profileId = await requireProfileId('/app/account');
  const enabled = String(formData.get('enabled') ?? '') === 'true';

  if (!enabled) {
    await member.setQuietHours(profileId, null);
  } else {
    const hour = (name: string, fallback: number) => {
      const parsed = Number(String(formData.get(name) ?? ''));
      return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : fallback;
    };
    const timeZone = String(formData.get('timeZone') ?? '');

    await member.setQuietHours(profileId, {
      startHour: hour('startHour', DEFAULT_QUIET_HOURS.startHour),
      endHour: hour('endHour', DEFAULT_QUIET_HOURS.endHour),
      // A zone the browser reported. Falls back rather than refusing, because
      // being wrong by a few hours beats a form that will not save.
      timeZone: isUsableTimeZone(timeZone) ? timeZone : DEFAULT_QUIET_HOURS.timeZone,
    });
  }

  revalidatePath('/app/account');
  revalidatePath('/app/deal-signals');
}
