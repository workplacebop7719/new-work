/**
 * The application's external dependencies, in one place.
 *
 * CMD-001 requires `dev` to "start the full local experience with safe mock
 * integrations", so this module resolves to the fakes until an adapter exists
 * (Q-13 identity, Q-14 payments). Swapping in a real adapter is a change to this
 * file and nothing else — that is the claim ADR-0006 makes, and keeping every
 * call site behind `integrations()` is what keeps it true.
 */
import { createFakeIntegrations, FakeIdentity, type Integrations } from '@northstar/integrations';

let instance: Integrations | undefined;

export function integrations(): Integrations {
  if (!instance) {
    instance = createFakeIntegrations();
  }
  return instance;
}

/**
 * Whether the identity provider is the in-memory fake.
 *
 * Two surfaces need to know. The demo sign-in panel is shown only when this is
 * true, and the enrolment screen offers a fixed passkey stand-in only when this
 * is true. Both are guarded by a check on the *object*, not on `NODE_ENV`: a
 * misconfigured production build that somehow kept the fake would still not show
 * a demo password, because the condition is "am I actually running the fake".
 */
export function usingFakeIdentity(): boolean {
  return integrations().identity instanceof FakeIdentity;
}
