'use server';

import { revalidatePath } from 'next/cache';
import { readSession } from '@/auth/session';
import { readRole } from './admin-repository';
import * as admin from './admin-repository';
import { canReleaseQuarantine, canDiscardQuarantine } from '@/auth/roles';

/**
 * Operator mutations (PRD §49).
 *
 * Each one re-reads the session and re-reads the role FROM THE DATABASE. It
 * never trusts a role supplied by the client, and never trusts one carried in
 * a session either — a session issued before someone was demoted would
 * otherwise keep working.
 *
 * A reason is required, not optional. These actions write to an append-only
 * record; "why" is the only part that cannot be reconstructed later.
 */

export interface ActionState {
  error: string | null;
  done: string | null;
}

async function requireStaff() {
  const session = await readSession();
  if (!session) return null;
  const role = await readRole(session.user.id);
  return { id: session.user.id, role };
}

export async function releaseQuarantineAction(
  _prev: ActionState, form: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return { error: 'You are not signed in.', done: null };
  if (!canReleaseQuarantine(staff.role)) {
    return { error: 'Releasing into the permanent record needs an admin.', done: null };
  }

  const id = String(form.get('heldId') ?? '');
  const reason = String(form.get('reason') ?? '').trim();
  if (reason.length < 8) {
    return { error: 'Say why in a few words — this is written to an audit trail.', done: null };
  }

  try {
    await admin.releaseQuarantine(staff.id, id, reason);
  } catch (err) {
    return { error: (err as Error).message, done: null };
  }
  revalidatePath('/admin/quarantine');
  return { error: null, done: 'Released into the permanent record.' };
}

export async function discardQuarantineAction(
  _prev: ActionState, form: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return { error: 'You are not signed in.', done: null };
  if (!canDiscardQuarantine(staff.role)) {
    return { error: 'That needs an operator account.', done: null };
  }

  const id = String(form.get('heldId') ?? '');
  const reason = String(form.get('reason') ?? '').trim();
  if (reason.length < 8) {
    return { error: 'Say why in a few words — this is written to an audit trail.', done: null };
  }

  try {
    await admin.discardQuarantine(staff.id, id, reason);
  } catch (err) {
    return { error: (err as Error).message, done: null };
  }
  revalidatePath('/admin/quarantine');
  return { error: null, done: 'Discarded. Nothing was recorded.' };
}
