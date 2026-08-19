import { notFound } from 'next/navigation';
import { isLocale, t } from '@/lib/i18n';

/**
 * PUB-005 — "A visitor can request phone, email or relay-friendly contact
 * without completing the qualifier."
 *
 * Reachable from every qualifier page and from the start page, and it asks for
 * nothing before showing the contact details. A "fast path to human help" that
 * first requires a form is not a fast path.
 */
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="ns-page">
      <h1>{t(locale, 'contact.heading')}</h1>
      <p className="ns-lede">{t(locale, 'contact.body')}</p>

      <dl className="ns-contact">
        <dt>{t(locale, 'contact.phoneLabel')}</dt>
        <dd>
          <a href="tel:+15555550142">+1 555 555 0142</a>
        </dd>

        <dt>{t(locale, 'contact.emailLabel')}</dt>
        <dd>
          <a href="mailto:hello@northstar.example">hello@northstar.example</a>
        </dd>

        <dt>{t(locale, 'contact.relayLabel')}</dt>
        <dd>{t(locale, 'contact.relayBody')}</dd>

        <dt>{t(locale, 'contact.accommodationLabel')}</dt>
        <dd>{t(locale, 'contact.accommodationBody')}</dd>
      </dl>

      <p>{t(locale, 'contact.noPressure')}</p>
    </div>
  );
}
