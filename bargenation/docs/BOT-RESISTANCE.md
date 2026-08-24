# Bot resistance

Sign-up, password reset and newsletter signup are the three forms worth
automating against: fake accounts, mail-bombing a real address, and poisoning
a subscriber list. All three now carry a challenge.

```bash
npm run smoke:challenge   # drives it in a real browser
```

## Why not a captcha vendor

reCAPTCHA, hCaptcha and Turnstile are all **third-party scripts**, and
`/privacy` states plainly that we do not load any:

> We do not load third-party scripts, so no advertising network is watching
> you here.

Adding one would make a published promise false. That is a decision about the
promise, not a technical detail to slip in — so this is first-party and
self-contained. If the promise is ever revised, the checks below sit behind
one function and a vendor can replace them.

## What it actually does

Three cheap checks that cost an automated caller far more than a person.

1. **Proof of work.** The browser must find a string whose SHA-256 starts with
   16 zero bits — about 65,000 hashes. Measured in a real browser: **under a
   second from page load**, including hydration. Somebody creating ten
   thousand accounts pays for all ten thousand. This does not stop a
   determined attacker; it prices bulk.

2. **A honeypot field.** Positioned off-screen rather than `display: none`, on
   purpose: a form filler that respects CSS would skip a hidden field, and
   catching those is the point. It is out of the tab order and inside an
   `aria-hidden` container, so nobody using a keyboard or a screen reader can
   reach it.

3. **Server-measured dwell time.** The gap between issuing the challenge and
   receiving it back, by **our** clock — never a number the client sends. A
   form returned in under 1.2 seconds was not typed by a person.

## What it is not

It is not an identity check and it does not decide who is human. There is no
puzzle, no image grid and no audio alternative, because **there is nothing for
anyone to solve** — which is a better accessibility answer than any of those,
not a worse one.

## Sign-in is deliberately not challenged

A challenge there taxes every returning customer on every visit to slow down
credential stuffing. Rate limiting handles that without charging the honest
majority — and rate limiting is still unbuilt (see AUTH.md).

## Every refusal says the same thing

One message, deliberately vague. Which check failed is a tuning signal —
"too fast" and "bad solution" together describe exactly how to get through. A
person who somehow trips it needs to know to try again, and nothing more.

## Order of checks

The signature is verified **before** anything derived from the values it
protects. `bits` arrives from the page; trusting it first would let a caller
ask for a difficulty of zero and hand back any string. A test asserts that a
self-lowered difficulty is refused.

## Configuration

```
APP_SECRET=   # at least 16 characters; CHALLENGE_SECRET still read
```

Without it, a per-process key is generated. Challenges still work, they just
stop being valid across a restart or a second instance —
`challengeSecretConfigured()` reports which is in use.

## Replay, closed

A solved challenge used to be submittable more than once inside its ten-minute
life. Signatures are now spent on use — see
[RATE-LIMITING.md](./RATE-LIMITING.md#challenge-replay-now-closed).

## The second submission, which used to be refused

Closing replay created a bug directly downstream of it, and it took a browser
smoke asking for two password resets in a row to find.

The challenge is issued when the **server renders the form**. A solved
signature can now be spent exactly once. So the second submission from the
same page was always refused — the browser still held the first challenge, and
the server was right to reject it.

That is not an edge case. It is the most ordinary path there is: ask for a
password reset, mistype the address, correct it, press the button again. The
person was told *"Something went wrong checking this form. Reload the page and
try again"* — unhelpful, and on a router-cached page actively wrong, since a
reload could hand back the same spent challenge.

**The fix.** `GET /api/challenge?purpose=…` issues a fresh one, and
`useChallenge` exposes a `refresh()` that the forms call every time their
action returns. The first challenge still comes from the page render, so the
common case costs no extra round trip; the route is only reached after a
submission.

Keyed on the action's **result**, not on `pending` — `pending` flips twice per
submission and would fetch two challenges for every one that was used.

**Why an open endpoint is safe.** Issuing is free and worthless alone; the cost
is in solving, which happens in the caller's browser. The signature commits to
a purpose and an issuing time, so a stockpile cannot be spent on a different
form, cannot outlive `MAX_AGE_MS`, and cannot be replayed. The route reads
nothing about who is asking and records nothing. An unknown purpose is refused
with 400 rather than defaulted — defaulting would mint a challenge bound to a
form the caller never asked about, which is the one thing the purpose field
exists to prevent.

**If the refetch fails** the old challenge is kept rather than cleared. A form
with no challenge still submits and the server can say what happened; a form
stuck showing "checking…" forever can do nothing at all.
