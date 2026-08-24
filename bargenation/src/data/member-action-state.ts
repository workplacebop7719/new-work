/**
 * What a member action tells the page afterwards.
 *
 * Lives here rather than beside the actions because `member-actions.ts` is
 * `'use server'`, where EVERY export must be an async server action. A plain
 * constant there compiles, typechecks, lints and passes every test — and
 * fails the production build.
 *
 * That has now happened three times in this codebase (`DELETE_CONFIRMATION`,
 * `isPlausibleToken`, and `IDLE`), which is why `scripts/check-server-exports.mjs`
 * exists to catch the fourth.
 */
export interface MemberActionState {
  error: string | null;
  notice: string | null;
}

/** The starting state for every `useActionState` on a member control. */
export const IDLE: MemberActionState = { error: null, notice: null };
