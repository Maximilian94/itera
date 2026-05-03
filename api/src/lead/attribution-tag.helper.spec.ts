import { computeTagsFromAttribution } from './attribution-tag.helper';

describe('computeTagsFromAttribution', () => {
  it('returns ["direct"] when attribution is undefined', () => {
    expect(computeTagsFromAttribution(undefined)).toEqual(['direct']);
  });

  it('returns ["direct"] when no UTMs and no click id', () => {
    expect(computeTagsFromAttribution({})).toEqual(['direct']);
  });

  it('tags paid_meta for instagram + cpc', () => {
    expect(
      computeTagsFromAttribution({ utmSource: 'instagram', utmMedium: 'cpc' }),
    ).toEqual(['paid_meta']);
  });

  it('tags paid_meta for facebook + paidsocial', () => {
    expect(
      computeTagsFromAttribution({
        utmSource: 'facebook',
        utmMedium: 'paidsocial',
      }),
    ).toEqual(['paid_meta']);
  });

  it('tags paid_google for google + cpc', () => {
    expect(
      computeTagsFromAttribution({ utmSource: 'google', utmMedium: 'cpc' }),
    ).toEqual(['paid_google']);
  });

  it('tags organic_social for instagram without paid medium', () => {
    expect(
      computeTagsFromAttribution({
        utmSource: 'instagram',
        utmMedium: 'social',
      }),
    ).toEqual(['organic_social']);
  });

  it('tags paid_meta when only fbclid is present (Meta auto-anexa)', () => {
    expect(computeTagsFromAttribution({ fbclid: 'IwAR123' })).toEqual([
      'paid_meta',
    ]);
  });

  it('tags paid_google when only gclid is present', () => {
    expect(computeTagsFromAttribution({ gclid: 'CjwKEAi' })).toEqual([
      'paid_google',
    ]);
  });

  it('is case-insensitive on source/medium', () => {
    expect(
      computeTagsFromAttribution({ utmSource: 'INSTAGRAM', utmMedium: 'CPC' }),
    ).toEqual(['paid_meta']);
  });

  it('falls back to direct when source/medium do not match known patterns', () => {
    expect(
      computeTagsFromAttribution({
        utmSource: 'newsletter',
        utmMedium: 'email',
      }),
    ).toEqual(['direct']);
  });
});
