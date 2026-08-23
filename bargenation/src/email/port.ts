/**
 * Email delivery port (PRD §41, §80).
 *
 * Provider-agnostic on purpose: §41 says not to couple business logic to one
 * provider. Nothing above this interface knows whether a message went via
 * Resend, SES or nowhere at all.
 *
 * NO PROVIDER IS CONFIGURED. There is no account with anyone, so the real
 * adapter cannot exist yet. What exists is the shape it will implement, and a
 * development adapter that records what WOULD have been sent — which is
 * enough to build and test every flow that depends on delivery.
 *
 * It lives here rather than under `newsletter/` because two unrelated parts of
 * the product now send mail: The Edit, and the account-recovery flows. An
 * `auth/` module reaching into `newsletter/` for a transport would be a
 * layering error that the import graph would happily allow.
 */

export interface Message {
  to: string;
  subject: string;
  /** Plain text. HTML templates come with the real provider. */
  body: string;
  /** Which flow produced this, for logging and for tests. */
  kind:
    | 'CONFIRM_SUBSCRIPTION'
    | 'EDIT_ISSUE'
    | 'DEAL_SIGNAL'
    | 'PASSWORD_RESET'
    | 'EMAIL_VERIFICATION';
}

export interface EmailPort {
  readonly name: string;
  /** False when nothing can actually be delivered. */
  readonly configured: boolean;
  send(message: Message): Promise<void>;
}

/**
 * Records messages in memory instead of sending them.
 *
 * Reports `configured: false`, so every surface that depends on delivery shows
 * itself as unavailable rather than silently succeeding — a subscription
 * confirmation that never arrives is worse than a form that admits it cannot
 * send one.
 */
export function createDevEmail(): EmailPort & { sent: Message[] } {
  const sent: Message[] = [];
  return {
    name: 'development (in-memory)',
    configured: false,
    sent,
    async send(message) {
      sent.push(message);
    },
  };
}

let cached: EmailPort | undefined;

export function email(): EmailPort {
  if (!cached) {
    // When a provider exists, it is selected here — the same shape as
    // createAuth(). Until then there is one adapter and it cannot deliver.
    cached = createDevEmail();
  }
  return cached;
}

export const emailConfigured = (): boolean => email().configured;
