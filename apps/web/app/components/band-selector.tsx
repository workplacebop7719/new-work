import { EMPLOYEE_BANDS, type EmployeeBand } from '@northstar/domain';
import { selectBand } from '@/app/actions/profile';
import { t, type Locale, type StringKey } from '@/lib/i18n';

const BAND_LABEL: Record<EmployeeBand, StringKey> = {
  under_20: 'band.under_20',
  '20_to_49': 'band.20_to_49',
  '50_to_199': 'band.50_to_199',
  '200_plus': 'band.200_plus',
};

const BAND_NOTE: Record<EmployeeBand, StringKey> = {
  under_20: 'band.note.under_20',
  '20_to_49': 'band.note.20_to_49',
  '50_to_199': 'band.note.50_to_199',
  '200_plus': 'band.note.200_plus',
};

/**
 * Employee-size selector — PUB-002, PRD §7.
 *
 * Submits on selection rather than requiring a separate "apply" press, but each
 * option is a real submit button, so it is reachable by keyboard, announced
 * properly, and works without JavaScript. A `<select>` with an onChange handler
 * would have been fewer lines and worse on all three counts.
 *
 * What it changes is *emphasis and annotation*, never availability: PUB-002 says
 * personalization must not hide the general site.
 */
export function BandSelector({
  locale,
  selected,
}: {
  locale: Locale;
  selected?: EmployeeBand | undefined;
}) {
  return (
    <section className="ns-section ns-section--muted" id="your-organization">
      <div className="ns-container">
        <p className="ns-eyebrow">{t(locale, 'band.eyebrow')}</p>
        <h2 className="ns-section__title">{t(locale, 'band.heading')}</h2>
        <p className="ns-section__lede">{t(locale, 'band.lede')}</p>

        <ul className="ns-band-list">
          {EMPLOYEE_BANDS.map((band) => {
            const isSelected = band === selected;
            return (
              <li key={band}>
                <form action={selectBand}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="band" value={band} />
                  <button
                    className={`ns-band${isSelected ? ' ns-band--selected' : ''}`}
                    type="submit"
                    // The pressed state is announced, not just drawn (ENG-004).
                    aria-pressed={isSelected}
                  >
                    <span className="ns-band__label">{t(locale, BAND_LABEL[band])}</span>
                    <span className="ns-band__note">{t(locale, BAND_NOTE[band])}</span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        {selected ? (
          <p className="ns-band__confirmation" role="status">
            {t(locale, 'band.confirmation').replace('{band}', t(locale, BAND_LABEL[selected]))}
          </p>
        ) : null}
      </div>
    </section>
  );
}
