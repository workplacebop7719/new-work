import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';

/**
 * Header and footer.
 *
 * The chrome is where a site either reads as considered or as assembled. Details
 * that are doing work here: a wordmark set in the display face, navigation with
 * an underline that grows from the baseline rather than a colour swap (so it
 * survives Windows High Contrast), a hairline rule instead of a shadow, and a
 * footer that behaves like a masthead — several columns, small type, and the
 * legal position stated rather than buried.
 */

export function SiteHeader({ locale }: { locale: Locale }) {
  const other: Locale = locale === 'en' ? 'fr' : 'en';

  return (
    <header className="ns-masthead">
      <div className="ns-masthead__inner">
        <Link className="ns-wordmark" href={`/${locale}`}>
          <span className="ns-wordmark__mark" aria-hidden="true">
            <NorthstarMark />
          </span>
          <span className="ns-wordmark__text">{t(locale, 'site.name')}</span>
        </Link>

        <nav className="ns-nav" aria-label={t(locale, 'nav.mainLabel')}>
          <Link className="ns-nav__link" href={`/${locale}/how-it-works`}>
            {t(locale, 'nav.howItWorks')}
          </Link>
          <Link className="ns-nav__link" href={`/${locale}#services`}>
            {t(locale, 'nav.services')}
          </Link>
          <Link className="ns-nav__link" href={`/${locale}/resources`}>
            {t(locale, 'nav.resources')}
          </Link>
          <Link className="ns-nav__link" href={`/${locale}/contact`}>
            {t(locale, 'nav.contact')}
          </Link>
        </nav>

        <div className="ns-masthead__actions">
          <nav aria-label={t(locale, 'nav.languageLabel')}>
            <Link className="ns-nav__link" href={`/${other}`} lang={other} hrefLang={other}>
              {t(locale, other === 'fr' ? 'nav.switchToFrench' : 'nav.switchToEnglish')}
            </Link>
          </nav>
          <Link className="ns-button ns-button--primary ns-button--compact" href={`/${locale}/check`}>
            {t(locale, 'nav.checkReadiness')}
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * The mark. Four strokes converging on a point — the four delivery stages, and
 * a north star without drawing a literal star. Decorative: the wordmark beside
 * it carries the name, so this is hidden from assistive technology.
 */
function NorthstarMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" focusable="false" aria-hidden="true">
      <path
        d="M12 1.5 L13.6 10.4 L22.5 12 L13.6 13.6 L12 22.5 L10.4 13.6 L1.5 12 L10.4 10.4 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="ns-colophon">
      <div className="ns-colophon__inner">
        <div className="ns-colophon__brand">
          <p className="ns-colophon__wordmark">{t(locale, 'site.name')}</p>
          <p className="ns-colophon__tagline">{t(locale, 'site.tagline')}</p>
        </div>

        <div className="ns-colophon__columns">
          <section>
            <h2 className="ns-colophon__heading">{t(locale, 'footer.exploreHeading')}</h2>
            <ul>
              <li><Link href={`/${locale}/check`}>{t(locale, 'nav.checkReadiness')}</Link></li>
              <li><Link href={`/${locale}/how-it-works`}>{t(locale, 'nav.howItWorks')}</Link></li>
              <li><Link href={`/${locale}#services`}>{t(locale, 'nav.services')}</Link></li>
              <li><Link href={`/${locale}/resources`}>{t(locale, 'nav.resources')}</Link></li>
              <li><Link href={`/${locale}/contact`}>{t(locale, 'nav.contact')}</Link></li>
            </ul>
          </section>

          <section>
            <h2 className="ns-colophon__heading">{t(locale, 'footer.positionHeading')}</h2>
            <p className="ns-colophon__note">{t(locale, 'footer.legal')}</p>
          </section>
        </div>
      </div>

      <div className="ns-colophon__baseline">
        <p>{t(locale, 'footer.workingTitle')}</p>
      </div>
    </footer>
  );
}
