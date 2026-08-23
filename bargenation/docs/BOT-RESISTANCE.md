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
CHALLENGE_SECRET=   # at least 16 characters
```

Without it, a per-process key is generated. Challenges still work, they just
stop being valid across a restart or a second instance —
`challengeSecretConfigured()` reports which is in use.

## Not built yet

**Replay within the window.** A solved challenge can be submitted more than
once inside its ten-minute life. Closing that needs somewhere to record spent
signatures, which is the same missing piece as rate limiting, and belongs in
that slice rather than bolted on here.
