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

## Not built yet

`/forgot-password`, `/reset-password`, `/verify-email` and the `/app` member
portal have no pages. The port supports all of them and `middleware.ts` already
guards `/app/*`; the surfaces are the next slice.
