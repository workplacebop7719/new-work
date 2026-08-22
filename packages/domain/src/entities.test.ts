import { describe, expect, it } from 'vitest';
import { APPLICABILITY, EMPLOYEE_BANDS, organization } from './entities';

describe('domain entities', () => {
  it('models employee count as a band, never an exact figure (A-03)', () => {
    expect(EMPLOYEE_BANDS).toEqual(['under_20', '20_to_49', '50_to_199', '200_plus']);
  });

  it('offers "needs review" so applicability is never forced to pass/fail (CLP-017)', () => {
    expect(APPLICABILITY).toContain('needs_review');
  });

  it('requires a jurisdiction on every organization (A-01)', () => {
    const result = organization.safeParse({
      id: 'x',
      legalName: 'Maple Grove Learning Group',
      organizationType: 'private_school',
      employeeBand: '50_to_199',
      jurisdiction: 'not-a-jurisdiction',
      preferredLanguage: 'en',
      createdAt: new Date(),
    });
    expect(result.success).toBe(false);
  });
});
