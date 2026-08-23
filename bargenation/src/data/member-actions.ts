'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { readSession } from '@/auth/session';
import { loginHref } from '@/auth/return-url';
import * as member from './member-repository';

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

async function requireProfileId(returnTo: string): Promise<string> {
  const session = await readSession();
  if (!session) redirect(loginHref(returnTo));
  return session.user.id;
}

export async function saveOfferAction(formData: FormData): Promise<void> {
  const offerId = String(formData.get('offerId') ?? '');
  const returnTo = String(formData.get('returnTo') ?? '/today');
  const profileId = await requireProfileId(returnTo);

  await member.save(profileId, offerId);
  revalidatePath(returnTo);
  revalidatePath('/app/saved');
}

export async function unsaveOfferAction(formData: FormData): Promise<void> {
  const offerId = String(formData.get('offerId') ?? '');
  const returnTo = String(formData.get('returnTo') ?? '/app/saved');
  const profileId = await requireProfileId(returnTo);

  await member.unsave(profileId, offerId);
  revalidatePath(returnTo);
  revalidatePath('/app/saved');
}

export async function watchProductAction(formData: FormData): Promise<void> {
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

  await member.watchProduct(profileId, slug, { targetPriceCents });
  revalidatePath(returnTo);
  revalidatePath('/app/watchlist');
}

export async function watchRetailerAction(formData: FormData): Promise<void> {
  const slug = String(formData.get('retailerSlug') ?? '');
  const returnTo = String(formData.get('returnTo') ?? '/stores');
  const profileId = await requireProfileId(returnTo);

  await member.watchRetailer(profileId, slug);
  revalidatePath(returnTo);
  revalidatePath('/app/watchlist');
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
