import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/lib/i18n';

/**
 * The bare root has no content of its own: every page lives under a locale so
 * that `lang` is always correct and hreflang alternates always exist (PUB-001,
 * CNT-006). Locale negotiation from Accept-Language arrives in CC-02 along with
 * the first real public page.
 */
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`);
}
