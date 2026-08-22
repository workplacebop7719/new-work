import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { readSession } from '@/auth/session';
import { readRole, adminFeaturesAvailable } from '@/data/admin-repository';
import { canAccessAdmin } from '@/auth/roles';

/**
 * The admin boundary (PRD §49).
 *
 * Not signed in  -> sign in.
 * Signed in, not staff -> 404, not 403.
 *
 * A 403 confirms the address exists and that the caller simply lacks
 * permission, which tells an attacker they have found something worth
 * attacking. A customer who wanders here should see exactly what they would
 * see for any address that is not theirs to know about.
 *
 * The role is read from the database on every request rather than trusted from
 * the session, so revoking someone's access takes effect immediately.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');

  if (!adminFeaturesAvailable) notFound();

  const role = await readRole(session.user.id);
  if (!canAccessAdmin(role)) notFound();

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-10 sm:px-8">
      <header className="border-b border-ink pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="eyebrow text-ink-50">Operations</p>
            <h1 className="display display-lg mt-2">Ingestion queue</h1>
          </div>
          <p className="eyebrow text-ink-50">
            {session.user.displayName ?? session.user.email} · {role}
          </p>
        </div>

        <nav aria-label="Operations" className="mt-8">
          <ul className="flex flex-wrap gap-x-7 gap-y-3">
            {[
              { href: '/admin', label: 'Overview' },
              { href: '/admin/review', label: 'Needs review' },
              { href: '/admin/quarantine', label: 'Quarantine' },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink hover:opacity-55"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="mt-12">{children}</div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
