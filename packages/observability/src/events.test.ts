import { describe, expect, it } from 'vitest';
import { Analytics, MemorySink } from './analytics';
import { NO_CONSENT } from './consent';
import { EVENT_NAMES, EventContractError, validateEvent } from './events';
import { redact, REDACTED } from './redaction';

const consented = { analytics: true, decidedAt: new Date('2026-09-01T00:00:00Z') };

describe('event taxonomy (ANL-001)', () => {
  it('implements exactly the PRD §19 list', () => {
    expect([...EVENT_NAMES].sort()).toEqual(
      [
        'assessment_selected',
        'booking_started',
        'change_order_accepted',
        'employee_band_selected',
        'evidence_requested',
        'evidence_uploaded',
        'export_requested',
        'finding_viewed',
        'official_source_opened',
        'purchase_completed',
        'qualifier_answered',
        'qualifier_completed',
        'qualifier_started',
        'report_released',
        'result_viewed',
        'source_viewed',
        'support_contacted',
        'task_assigned',
      ].sort(),
    );
  });

  it('rejects an undeclared event', () => {
    // @ts-expect-error — the type system blocks this too; the runtime check is
    // for payloads arriving from outside TypeScript.
    expect(() => validateEvent('qualifier_abandoned', {})).toThrow(EventContractError);
  });

  it('rejects an undeclared property on a declared event', () => {
    expect(() =>
      validateEvent('qualifier_started', { locale: 'en', organizationName: 'Maple Grove' }),
    ).toThrow(EventContractError);
  });
});

describe('forbidden properties (ANL-002, ENG-003)', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['email', { locale: 'en', email: 'a@b.example' }],
    ['storage key', { locale: 'en', storageKey: 'evidence/123' }],
    ['file name', { locale: 'en', fileName: 'policy.pdf' }],
    ['tenant id', { locale: 'en', organizationId: 'org_1' }],
    ['internal margin', { locale: 'en', margin: 0.55 }],
    ['document content', { locale: 'en', content: 'Our accessibility policy...' }],
  ];

  for (const [label, payload] of cases) {
    it(`refuses to emit ${label}`, () => {
      expect(() => validateEvent('qualifier_started', payload)).toThrow(EventContractError);
    });
  }
});

describe('consent gate (PUB-006)', () => {
  it('does not dispatch before consent', async () => {
    const sink = new MemorySink();
    const analytics = new Analytics(sink);
    const dispatched = await analytics.track('qualifier_started', { locale: 'en' }, NO_CONSENT);
    expect(dispatched).toBe(false);
    expect(sink.events).toEqual([]);
  });

  it('does not treat an undecided visitor as consenting', async () => {
    const sink = new MemorySink();
    const analytics = new Analytics(sink);
    await analytics.track('qualifier_started', { locale: 'en' }, { analytics: true });
    expect(sink.events).toEqual([]);
  });

  it('dispatches once consent is recorded', async () => {
    const sink = new MemorySink();
    const analytics = new Analytics(sink);
    expect(await analytics.track('qualifier_started', { locale: 'en' }, consented)).toBe(true);
    expect(sink.events).toHaveLength(1);
  });

  it('still enforces the contract when consent is absent', async () => {
    const analytics = new Analytics(new MemorySink());
    await expect(
      analytics.track(
        'qualifier_started',
        // @ts-expect-error — the type system rejects this too. Both layers are
        // asserted deliberately: types stop it in the editor, and the runtime
        // check stops a payload that arrives from outside TypeScript (a webhook,
        // a JSON body, a JS call site).
        { locale: 'en', email: 'a@b.example' },
        NO_CONSENT,
      ),
    ).rejects.toThrow(EventContractError);
  });
});

describe('redaction (ARC-009)', () => {
  it('removes values under sensitive keys', () => {
    expect(redact({ password: 'hunter2', signedUrl: 'https://x/y?sig=1' })).toEqual({
      password: REDACTED,
      signedUrl: REDACTED,
    });
  });

  it('removes emails and phone numbers found inside free text', () => {
    const result = redact({ note: 'Call Priya on 416-555-0142 or priya@maplegrove.example' }) as {
      note: string;
    };
    expect(result.note).not.toContain('@maplegrove.example');
    expect(result.note).not.toContain('416-555-0142');
  });

  it('truncates rather than recursing without limit', () => {
    let deep: Record<string, unknown> = { value: 'end' };
    for (let i = 0; i < 12; i += 1) deep = { nested: deep };
    expect(JSON.stringify(redact(deep))).toContain('truncated');
  });
});
