# Authentication

Built against a typed port so no page, action or component imports a provider
directly. Supabase Auth is the intended provider; until credentials exist, a
development adapter keeps the member surface buildable (PRD §80).

## Adapter selection

| Condition | Adapter | `configured` |
|---|---|---|
| Supabase credentials present | `supabase` | `true` |
| **Production, no credentials** | **`unconfigured`** | `false` |
| Otherwise | `development (in-memory)` | `true` |

The middle row is the one that matters. The development adapter stores users
in memory with no verification, so if it ever reached production **anyone
could create an account as anyone**. Production without credentials degrades
to a port that refuses every operation — never to the fake. `createDevAuth`
also throws on construction under `NODE_ENV=production` as a second line of
defence. Both are asserted by tests.

When nothing is configured the port reports `configured: false`, and the sign-in
and sign-up forms render their submit button visibly disabled with the reason
stated, rather than accepting a password and failing at the end (§01).

The port also reports `deliversEmail`, which is a different question: whether a
link it issues reaches an inbox. Supabase sends its own transactional mail, so
that adapter reports true; the development adapter hands its links to an email
port that records them, so it reports false. See **Delivery, and saying so**.

## Required environment

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

The **service-role key is deliberately absent**. It bypasses row level
security entirely, so it must never be used by request-handling code (§69).

> The Supabase adapter is complete and typechecked but **has never made a real
> call**, because no project exists yet. Treat its first run against a live
> project as the point where it is genuinely verified. The tests cover the
> translation layer, not the network.

## Three layers, none of which trusts the others

1. **`middleware.ts`** — a cheap gate. Edge runtime, so it only checks whether
   a session cookie is present and bounces anonymous visitors to sign in with
   their destination remembered. **A cookie's presence proves nothing.**
2. **Server-side session resolution** — resolves the cookie to a real session.
   A forged or expired cookie gets past middleware and is stopped here.
3. **PostgreSQL row level security** — decides what a given customer can read
   or write, and holds even if both layers above are wrong.

## Open redirect protection

`safeReturnTo` is an **allowlist**: a candidate must positively prove it is a
same-origin path, and anything else silently becomes `/today`.

This matters because the "come back to what you were doing" value arrives from
the query string, which is attacker-controlled. A phishing link can send
someone to our genuine sign-in page and bounce them — freshly authenticated
and trusting — to a copy of it.

40 tests cover it, including protocol-relative URLs, backslash normalisation,
percent-encoded slashes, userinfo tricks, `javascript:` and `data:` schemes,
CR/LF header injection, and raw control characters. It also refuses to return
into the auth flow itself, without being fooled by case or by a path that
merely starts with the same letters (`/loginary` is fine).

## Error handling

Provider errors are translated into a closed set of codes, and the UI renders
copy from our own table. A raw Supabase string never reaches a customer — the
wording is not ours, and provider errors distinguish "no such user" from
"wrong password", which would turn the sign-in form into an
account-enumeration oracle.

Both the dev adapter and the translation layer are tested to give **the same
answer for a wrong password and an unknown account**. Password reset likewise
succeeds whether or not the address exists.

A password reset invalidates every existing session: reset is how someone
recovers a compromised account, so the attacker's session must not survive it.

Catch blocks use `isAuthError()`, never `instanceof` — see **The bug that unit
tests could not see** below for why that distinction is load-bearing.

## Profile provisioning

A customer who has authenticated has an identity but no `profiles` row, and
everything they own hangs off that row. Provisioning therefore happens in the
**sign-in and sign-up actions**, not on entry to the portal.

An earlier version provisioned only in the `/app` layout, which meant somebody
who signed up and immediately pressed Save on a deal hit a foreign-key
violation. It was found by driving the real flow in a browser
(`npm run smoke`); no unit test would have caught it, because each piece
worked correctly on its own.

The insert runs as the customer, so the RLS `WITH CHECK (id = auth.uid())`
means you can only ever create your own — asserted by a test.

## Account recovery

`/forgot-password`, `/reset-password` and `/verify-email` are built, and the
whole flow is driven end to end by `npm run smoke:recovery`.

**Nothing about the forgot-password page may reveal who has an account.** The
confirmation is identical for a known and an unknown address, it renders in
place rather than redirecting to a "check your inbox" URL — a changed URL is
itself a signal anybody watching can read — and no message is sent to an
address with no account, because "you have no account here" in an inbox is the
same disclosure moved somewhere more readable.

**Confirming an email is a button, not something the page does on load.** Mail
scanners, link previewers and prefetchers fetch URLs they find in messages. A
GET that consumed the token would let a security appliance burn it before the
customer clicked, and they would be told their link had expired.

**A successful reset does not sign anybody in.** It redirects to sign-in with
`?reset=1`. A reset link that granted a session would mean possession of the
link is possession of the account, and links reach forwarded mail and browser
history. The adapters separately invalidate every existing session, which is
the half that matters when somebody is recovering a compromised account.

Tokens arriving in a link are shape-checked by `isPlausibleToken` before they
reach a provider — bounded, no whitespace (mail clients wrap long links), no
control characters — and never parsed for meaning, because the format belongs
to whichever adapter issued it.

### Delivery, and saying so

Transactional mail goes through `src/email/port.ts`, the same port The Edit
uses. No provider is configured, so the development adapter's links are
recorded rather than sent, and the port reports `deliversEmail: false`. The
recovery pages read that and say **"Nothing will arrive in your inbox"** before
anybody types — a form that accepts an address and leaves someone refreshing
their mail is the pretend functionality §01 forbids. The notice disappears on
its own once a provider that delivers its own mail is configured.

For local work the development adapter also writes the link to the **server
log**, which is the only way to complete the flow by hand. That branch cannot
exist in a deployed process: the adapter throws on construction under
`NODE_ENV=production`. It goes to the log rather than the page because a reset
link is a bearer credential and the log is the one place only the developer
running the server can read.

## The bug that unit tests could not see

`messageFor` used `err instanceof AuthError`. Every test passed. In the running
server, **every** auth failure rendered "We couldn't reach our sign-in
service" — wrong password, address already taken, password too short, all of
them. `AUTH_MESSAGE` was dead code in practice.

`instanceof` compares prototypes, which means it compares class objects.
`actions.ts` is `'use server'`, which Next bundles into a different graph from
the one the adapters are reached through, so `types.ts` is instantiated twice
and an AuthError thrown by an adapter is not an `instanceof` the AuthError that
actions.ts imported. Inside one Vitest module graph there is only ever one
class, which is exactly why no unit test noticed.

The fix is a brand: `AuthError` carries a stable marker and `isAuthError()`
checks that marker **and** that the code is one AUTH_MESSAGE actually has copy
for — a duck-typed guard that trusted `code` would render the string
"undefined" to a customer. `src/auth/error-identity.test.ts` reproduces the
duplication with `vi.resetModules()` and asserts both halves.

**Never write `instanceof` on an error that crosses the server-action
boundary.** Found by driving the flow in a browser, like the profile
provisioning bug before it.

## Account self-service

**Changing a password requires the current one.** Not friction to be smoothed
away — it is the only thing between a borrowed laptop and a complete takeover,
because changing the password is how an attacker locks the owner out of their
own recovery flow. Succeeding invalidates every other session and issues a
fresh one for the device that made the change, so it takes effect everywhere
at once without signing that browser out.

**Deleting requires the password and the typed word.** The password stops
somebody else; the typed word stops you, which is the far likelier way a
Watchlist is lost. Our data goes first and the login identity second, so a
failure halfway leaves an account that can still sign in and try again.

Everything customer-owned cascades from `profiles`, so erasure is one DELETE
rather than a list that has to be kept in step with the schema. A new
customer-owned table added without `on delete cascade` fails the test.

Two things deliberately survive, and the page says both before the form:

- **A subscription to The Edit.** `newsletter_subscribers.profile_id` is
  `on delete set null` because subscribing was a separate act of consent with
  its own evidentiary record. Silently revoking it would be as wrong as
  silently keeping it, so the page links to the unsubscribe page.
- **The login identity, when Supabase is the provider.** Deleting a user is an
  admin operation needing the service-role key, which bypasses RLS and is
  deliberately absent (§69). `canDeleteIdentity` reports false there, and the
  page says we erased everything we hold rather than implying more.

An operator who has taken recorded actions cannot be erased at all:
`admin_actions.actor_id` is `on delete restrict`. That is the audit trail
refusing to lose its author. It surfaces as a sentence, not a constraint
violation.

**Export** is a route handler, not a server action, because the honest form of
"give me my data" is a file — only `Content-Disposition` produces one. Scope
comes from RLS: there is no profile id parameter to get wrong, which matters
most here, since an export that reached another household would hand one
customer another's children's sizes in a file they keep.

## Rate limiting

Built — see [RATE-LIMITING.md](./RATE-LIMITING.md). Sign-in, sign-up, reset
requests and reset-token attempts all carry allowances, and sign-in is
deliberately **not** limited by account, because that is an lockout anybody
who knows your address could trigger.

The port still maps a provider 429 to `RATE_LIMITED`, so Supabase's own limits
surface in our copy rather than as a raw provider string.
