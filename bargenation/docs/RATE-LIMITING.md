# Rate limiting

The bot challenge prices bulk automation. It does nothing about somebody
patiently trying ten thousand passwords against one account, or asking for a
password reset a hundred times to bury a real person in mail. This does.

```bash
npm run smoke:rate-limit   # drives it in a real browser
```

## The lockout this started with

The first version counted failed sign-ins **against the address** and refused
once the allowance was spent. A browser test then did the obvious thing —
burned the allowance with wrong guesses, then signed in with the **correct**
password — and the owner was refused.

That is an account lockout handed to anybody who knows your email address: a
denial of service wearing the clothes of a protection. Nothing in the unit
tests could see it, because each piece behaved exactly as written.

**So sign-in is limited by caller only.** An attacker can fill their own
bucket and nobody else's, and a correct password is never refused however many
wrong ones came before it. `RATE_LIMITS.SIGN_IN.perSubject` is `null`, and a
test asserts that specifically so the lockout cannot come back.

The residual risk is stated rather than hidden: a distributed attack, a few
guesses each from a thousand callers, is not stopped by this. The answer to
that is password strength and monitoring — not a lockout that hands the same
weapon to anyone who wants it.

Every **other** bucket keeps both dimensions, because refusing a sign-up, a
reset request or a subscription cannot lock anybody out of an account they
already have.

## The allowances

| Bucket | Window | Per address | Per caller |
|---|---|---|---|
| Sign in | 15 min | — | 20 |
| Sign up | 1 hour | 5 | 20 |
| Password reset request | 1 hour | **3** | 15 |
| Password reset token | 15 min | 10 | 20 |
| Subscribe | 1 hour | 3 | 15 |

Sign-in is **20 per caller, not the 50 it started at** — precisely because
there is no address limit behind it. Fifty failures every quarter hour is
nearly five thousand a day from one connection, which is a formality rather
than a limit.

Password reset has the tightest per-address allowance of any bucket, and a
test enforces that ordering: every attempt there can put mail in somebody
else's inbox.

## Nothing personal is stored

Neither table holds an address or an IP. Both hold a keyed token —
HMAC-SHA256 under a per-purpose label, from `security/secret.ts` — and every
row is deleted within a day.

The **key** is what makes that real rather than decorative. An unkeyed hash of
an IPv4 address is four billion candidates, which is seconds of work on a
laptop.

The **label** is what stops one feature's tokens being matched against
another's: the same value hashed for rate limiting and for the bot challenge
produces two unrelated values, and a test asserts it.

`/privacy` says all of this in plain words, because "we do not record your IP
address" would otherwise have quietly become untrue.

## Two failure modes, chosen deliberately

**An unidentifiable caller fails OPEN.** When a request arrives with no proxy
header, that dimension is skipped rather than treated as one shared bucket.
Failing closed would mean a single missing header puts every visitor in the
world into one allowance and the site rate-limits itself into an outage. A
missing header is a misconfiguration; an outage is an incident.

**No database means no limiting, and it says so.** `rateLimitingAvailable()`
reports it rather than letting a deployment run unprotected while believing
otherwise.

## `x-forwarded-for` is only as good as what sits in front

Only the **last** entry is taken, because that is the one appended by
infrastructure we control. Trusting the first would let anybody rotate their
own limit away by sending a fresh header each request.

**With no trusted proxy in front, the whole header is client-controlled and
the caller dimension can be evaded.** That is a deployment requirement, not a
code fix: whatever terminates TLS must append the real address. Until then the
per-address limits are what actually holds.

## Challenge replay, now closed

`BOT-RESISTANCE.md` documented an open gap: a solved challenge could be
submitted repeatedly inside its ten-minute life, so one unit of work bought as
many sign-ups as somebody cared to send. Signatures are now spent on use.

**The insert is the check** — `on conflict do nothing`, and a row count of one
means it was fresh. Asking first and inserting afterwards leaves a window
where two concurrent requests both see nothing and both proceed, which is
exactly the request pattern an attacker sends. A test fires eight at once and
asserts exactly one gets through.

## Housekeeping

`prune_rate_limits()` runs at the **start of every signal sweep**,
unconditionally. Putting it behind "if there are watches to sweep" would mean
an installation with no watches never prunes — rows accumulating forever
precisely where nobody is looking.

## Seeing an attack without seeing a person

`/admin/abuse`, migration 0021 (§69).

This was the outstanding gap: the limits worked and nothing showed whether
they were being hit, so the first sign of an attack would have been a customer
saying they could not sign in.

The obvious build is a select on `rate_limit_hits`. It is refused, for the same
reason `/admin/audience` refuses a users table — an operator reading a
per-token activity log is reading a behavioural record, and a token plus a
timestamp plus one more surface is how a "not personal" identifier stops being
one. **Staff have no select on that table at all.** `abuse_summary()` is a
`security definer` function granted to `bargenation_admin` and to nothing else;
`bargenation_app` cannot call it, because a survey reachable from a request
handler is a survey reachable from a bug.

Four figures per bucket and dimension, none of them a row:

| | what it answers |
| --- | --- |
| `attempts` | is the volume unusual for this bucket |
| `distinct_tokens` | one source hammering, or thousands each trying a little |
| `busiest_token_attempts` | how concentrated — a magnitude with no subject |
| `tokens_over_limit` | how many are past the allowance and being refused now |

Concentration is the figure that decides what you do. A thousand attempts from
one source is an incident and a block. The same thousand across nine hundred
sources is a distributed attempt that no per-caller limit will stop, and the
answer to it is password strength, not a lockout. The page states that reading
in a sentence rather than leaving an operator to do the division at 2am.

**The allowance is passed in, not copied.** `RATE_LIMITS` in
`src/security/rate-limit.ts` is what is actually enforced. A second copy in SQL
would drift, and the drifted copy would be the one drawing the dashboard — so
`readAbuseSummary` hands the function the number it really applies. A `null`
`perSubject` (sign-in, deliberately) reports zero over-limit rather than
counting against an allowance that does not exist.

## Not built yet

**Telling anybody it happened.** `/admin/abuse` shows an attack to an operator
who looks. Nothing pages one who is asleep — that needs a delivery channel,
which nothing in this product has yet. See [LEGAL.md](./LEGAL.md) and the
delivery gap in [DEAL-SIGNALS.md](./DEAL-SIGNALS.md).
