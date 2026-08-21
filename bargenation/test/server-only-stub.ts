/**
 * `server-only` throws when imported outside a React Server Component. That
 * guard is exactly what we want in the app build, so it stays in the source —
 * this stub only satisfies it under Vitest, where there is no RSC boundary.
 */
export {};
