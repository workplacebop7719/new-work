'use server';


import { requestSubscription } from './subscribe';
import { email } from '@/email/port';
import {
  challengeFromForm, verifyChallenge, CHALLENGE_MESSAGE,
} from '@/security/challenge';
import { memberFeaturesAvailable } from '@/data/member-repository';

/**
 * Subscribing to The Edit (PRD §38, §40).
 *
 * Marketing consent is a SEPARATE decision from having an account (§30), so
 * this flow never touches authentication.
 */
export interface SubscribeState {
  error: string | null;
  pending: string | null;
  /**
   * Development only. With no email provider there is no way to deliver a
   * confirmation link, so it is surfaced here rather than pretending one was
   * sent. Never populated once a provider exists.
   */
  devConfirmUrl: string | null;
}

/**
 * A subscriber list is worth poisoning: signing a real address up to a list it
 * never asked for is harassment, and it burns our sending reputation. Double
 * opt-in already means a forged address never receives an issue, but it does
 * mean a forged address receives a confirmation email — so the challenge
 * stops the flood before it becomes mail somebody else has to read.
 */
export async function subscribeAction(
  _prev: SubscribeState, form: FormData,
): Promise<SubscribeState> {
  const address = String(form.get('email') ?? '');
  const source = String(form.get('source') ?? '/edit');

  const verdict = verifyChallenge(challengeFromForm(form), 'SUBSCRIBE');
  if (!verdict.ok) {
    return { error: CHALLENGE_MESSAGE, pending: null, devConfirmUrl: null };
  }

  if (!memberFeaturesAvailable) {
    return {
      error: 'No database is configured here, so a subscription could not be stored.',
      pending: null, devConfirmUrl: null,
    };
  }

  const result = await requestSubscription({ email: address, source });
  if (!result.ok) return { error: result.reason, pending: null, devConfirmUrl: null };

  if (result.state === 'ALREADY_SUBSCRIBED') {
    return {
      error: null,
      pending: 'You are already on the list. Nothing has changed.',
      devConfirmUrl: null,
    };
  }

  const provider = email();
  const confirmUrl = `/edit/confirm?token=${result.confirmToken}`;

  if (provider.configured) {
    await provider.send({
      to: address,
      subject: 'Confirm your Bargenation Edit subscription',
      body: `Confirm here: ${confirmUrl}`,
      kind: 'CONFIRM_SUBSCRIPTION',
    });
    return {
      error: null,
      pending: 'Check your email and follow the link to confirm. You are not subscribed until you do.',
      devConfirmUrl: null,
    };
  }

  // No provider. Say so plainly rather than claiming an email is on its way.
  return {
    error: null,
    pending:
      'Your request was recorded, but we cannot email you yet — no delivery provider is ' +
      'configured. You are NOT subscribed, and nothing will be sent.',
    devConfirmUrl: confirmUrl,
  };
}

export interface ManageState {
  error: string | null;
  done: string | null;
}

export async function unsubscribeAction(
  _prev: ManageState, form: FormData,
): Promise<ManageState> {
  const token = String(form.get('token') ?? '');
  const { unsubscribe } = await import('./subscribe');
  const result = await unsubscribe(token);
  if (!result.ok) return { error: result.reason, done: null };
  return { error: null, done: 'Unsubscribed. Nothing further will be sent.' };
}

export async function setCadenceAction(
  _prev: ManageState, form: FormData,
): Promise<ManageState> {
  const token = String(form.get('token') ?? '');
  const cadence = String(form.get('cadence') ?? '');
  const { setCadence } = await import('./subscribe');
  const ok = await setCadence(token, cadence);
  if (!ok) return { error: 'That frequency is not one we offer.', done: null };
  return { error: null, done: 'Saved.' };
}
