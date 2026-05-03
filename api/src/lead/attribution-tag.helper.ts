import type { AttributionData } from '@domain/diagnostico/diagnostico.interface';

const META_SOURCES = new Set(['facebook', 'instagram', 'fb', 'ig']);
const PAID_MEDIUMS = new Set(['cpc', 'paid', 'paidsocial', 'paid-social', 'ppc']);

/**
 * Deriva tags de marketing source a partir de UTMs / fbclid / gclid.
 * Regras (do §7):
 *  - paid_meta:        source ∈ {facebook, instagram} ∧ medium ∈ paid
 *  - paid_google:      source = google ∧ medium ∈ paid
 *  - organic_social:   source ∈ {facebook, instagram} ∧ medium ∉ paid
 *  - direct:           sem UTM e sem fbclid/gclid
 *
 * `fbclid` sozinho (sem UTMs) é tratado como `paid_meta` — Meta auto-anexa
 * em qualquer clique que originou em FB/IG ads.
 */
export function computeTagsFromAttribution(
  attribution?: AttributionData,
): string[] {
  if (!attribution) return ['direct'];

  const source = attribution.utmSource?.toLowerCase().trim();
  const medium = attribution.utmMedium?.toLowerCase().trim();
  const hasFbclid = Boolean(attribution.fbclid?.trim());
  const hasGclid = Boolean(attribution.gclid?.trim());
  const hasAnyUtm = Boolean(
    source ||
      medium ||
      attribution.utmCampaign ||
      attribution.utmContent ||
      attribution.utmTerm,
  );

  if (!hasAnyUtm && !hasFbclid && !hasGclid) {
    return ['direct'];
  }

  const isPaidMedium = medium ? PAID_MEDIUMS.has(medium) : false;
  const isMetaSource = source ? META_SOURCES.has(source) : false;

  if (isMetaSource && isPaidMedium) return ['paid_meta'];
  if (source === 'google' && isPaidMedium) return ['paid_google'];
  if (isMetaSource && !isPaidMedium) return ['organic_social'];

  // fbclid sem UTM = clique vindo de Meta Ads (auto-anexado pelo Meta).
  if (hasFbclid && !hasAnyUtm) return ['paid_meta'];
  if (hasGclid && !hasAnyUtm) return ['paid_google'];

  return ['direct'];
}
