# Operations

The surface for working the ingestion queue (PRD §49).

```
/admin              what needs attention, and recent decisions
/admin/review       records the matcher would not decide
/admin/quarantine   prices too extraordinary to record on one sighting
```

Needs `ADMIN_DATABASE_URL`, naming the `bargenation_admin` role.

## Access

Not signed in → sign in. Signed in but not staff → **404, not 403**.

A 403 confirms the address exists and that the caller merely lacks permission,
which tells someone probing that they have found something worth attacking. A
customer who wanders here sees what they would see for any address that is not
theirs to know about.

The role is read **from the database on every request**, never trusted from the
session, so revoking access takes effect immediately rather than at next
sign-in.

## The privilege escalation this had to avoid

Migration 0003 gave every customer `using (id = auth.uid())` on their own
profile — correct for a display name. The moment a `role` column joined that
row, it also meant:

```sql
update profiles set role = 'admin'   -- their own row, so the policy allows it
```

**RLS answers "which rows", never "which columns".**

The fix is a column-level grant, and the order matters: in PostgreSQL,
table-level and column-level privileges are separate, and a table-level UPDATE
covers every column including ones added later. `revoke update (role)` against
a table-level grant simply does nothing. The table grant has to be dropped
first, then `grant update (display_name)`.

A first attempt did only the column revoke. A customer promoted themselves to
admin on the very next query, which is how it was caught.

## What an operator can reach

Enumerated grants, `nobypassrls`, same discipline as the signal job:

| Can | Cannot |
|---|---|
| ingestion queue, quarantine, source runs | households, household members |
| catalog: products, offers, retailers | saved items, watchlists, deal signals |
| read and append price history | preferences, newsletter subscribers |
| write audit rows | edit or erase audit rows |
| — | rewrite price history |
| — | anything in schema `commerce` |

Working a product-match queue does not require reading anybody's family. Each
row of that table is a test.

## Two permission levels, because two weights of action

**Resolving a match** is available to operators. It records an alias that
redirects future records, which is consequential enough to need a written
reason but does not touch permanent history.

**Discard** is available to operators. The price can be observed again
tomorrow, so a wrong discard costs a day.

**Release is admin-only.** It writes into `price_observations`, which is
append-only — nobody can undo it, and every future Value Index for that product
is measured against what was released.

The interface reflects that asymmetry rather than styling both as "edit
quarantine". Release is deliberately **not** the primary-looking button: making
the irreversible choice the most inviting thing on screen is how people end up
clicking it.

## Every decision is recorded

`admin_actions` is append-only, with triggers refusing UPDATE and DELETE. The
audit row is written **in the same transaction** as the change it describes —
an audit trail written afterwards is one that can be missing exactly when it
matters.

A reason is required, not optional. Everything else about a release can be
reconstructed from the data; why somebody judged it real cannot.

`admin_actions.actor_id` is `ON DELETE RESTRICT`, so a staff account that has
made decisions cannot be deleted. You must not be able to erase who authorised
something by removing the account.

## What the operator surface now covers

| Route | What it does |
| --- | --- |
| `/admin` | The queue: awaiting review, quarantined, runs and failures in 24h, refused records, offers gone stale |
| `/admin/review` | Records the matcher would not decide, resolved by a named person with a reason |
| `/admin/quarantine` | Prices too extraordinary to trust once, released or discarded — and now expiring |
| `/admin/sources` | Every feed, its last run, and what that run did |
| `/admin/audience` | Counts, and nothing that could identify anybody (migration 0020) |
| `/admin/abuse` | The shape of an attack, and nothing that could identify anybody (migration 0021) |
| `/admin/revenue` | Commission, and proof the scoring process cannot reach it |

`/admin/audience` and `/admin/abuse` are the two that had to be designed rather
than built. §49 asks for views of users and of the newsletter, and the obvious
implementation grants staff read access to profiles, watchlists, deal signals
and subscribers — which migration 0010 revokes in writing, and 0012 withholds
read-by-email specifically so the newsletter cannot become an
address-enumeration oracle. Handing that back to draw a dashboard would undo
five migrations of work for a number on a screen. Both pages ask a question
through a `security definer` function and get aggregates. **There is no search,
no list, and no way to ask about one person.** That is the feature.

**Stale quarantine expires.** `expire_quarantine()` (migration 0019) discards
held observations that nobody has judged, recording the expiry in
`admin_actions` with a null `actor_id` — a decision the system made, attributed
to the system rather than to a person who was not there.

## Not built yet

- **Agents (§49).** There is no agent model, so there is nothing to show.
- **Alerting an operator.** Every page here rewards somebody who looks. Nothing
  reaches somebody who is not looking, because no delivery channel exists.
