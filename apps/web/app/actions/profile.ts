'use server';

import { redirect } from 'next/navigation';
import { isEmployeeBand, writeBand } from '@/lib/profile';
import { track } from '@/lib/analytics';
import { isLocale, type Locale } from '@/lib/i18n';

/**
 * Records the employee-band preference (PUB-002).
 *
 * A plain form POST, so the selector works with JavaScript disabled like
 * everything else on the public site (ARC-006).
 */
export async function selectBand(formData: FormData): Promise<void> {
  const rawLocale = String(formData.get('locale') ?? 'en');
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const band = String(formData.get('band') ?? '');

  if (!isEmployeeBand(band)) redirect(`/${locale}`);

  await writeBand(band);
  await track('employee_band_selected', { locale, band });

  // Back to the section the visitor was reading, not the top of the page.
  redirect(`/${locale}#your-organization`);
}
