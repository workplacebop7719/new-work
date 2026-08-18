/**
 * Demo seed — CMD-003 (PRD §27 "Seed/demo scenario").
 *
 * Fictional data only. "Maple Grove Learning Group" is an invented Ontario
 * education operator; a second tenant is included so that the tenant boundary
 * is *visible* in the demo rather than merely asserted, which the PRD asks for.
 *
 * Nothing here represents a real regulatory certification, and no row claims a
 * compliance status (CLP-017, ENG-008).
 */
import { withSystemContext } from './client';

export interface SeedResult {
  readonly organizations: { id: string; name: string }[];
  readonly users: { id: string; email: string; role: string }[];
}

const MAPLE_GROVE = '0199a000-0000-7000-8000-00000000a001';
const RIVERSIDE = '0199a000-0000-7000-8000-00000000b001';

/** Deterministic ids keep the demo stable across reseeds and preview environments. */
const id = (suffix: string): string => `0199a000-0000-7000-8000-0000000${suffix}`;

const USERS = [
  { id: id('c0001'), email: 'admin@maplegrove.example', name: 'Priya Raman', role: 'client_admin', org: MAPLE_GROVE },
  { id: id('c0002'), email: 'exec@maplegrove.example', name: 'Denis Cormier', role: 'client_executive', org: MAPLE_GROVE },
  { id: id('c0003'), email: 'web@maplegrove.example', name: 'Sam Okonkwo', role: 'client_contributor', org: MAPLE_GROVE },
  { id: id('c0004'), email: 'auditor@specialists.example', name: 'Lin Zhao', role: 'contractor', org: MAPLE_GROVE },
  { id: id('c0005'), email: 'pm@northstar.example', name: 'Alex Tremblay', role: 'internal_pm', org: MAPLE_GROVE },
  { id: id('c0006'), email: 'reviewer@northstar.example', name: 'Morgan Bell', role: 'qualified_reviewer', org: MAPLE_GROVE },
  { id: id('c0007'), email: 'platform@northstar.example', name: 'Robin Fraser', role: 'platform_admin', org: MAPLE_GROVE },
  // Second tenant, so a demo can show that the same platform admin sees nothing here by default.
  { id: id('d0001'), email: 'admin@riverside.example', name: 'Chris Nadeau', role: 'client_admin', org: RIVERSIDE },
] as const;

export async function seed(): Promise<SeedResult> {
  return withSystemContext('seeding non-production demo data', async (tx) => {
    await tx.query(
      `INSERT INTO organizations (id, legal_name, organization_type, employee_band, jurisdiction, preferred_language)
       VALUES ($1, $2, 'private_school', '50_to_199', 'CA-ON', 'en'),
              ($3, $4, 'care_provider',  '20_to_49',  'CA-ON', 'fr')
       ON CONFLICT (id) DO NOTHING`,
      [MAPLE_GROVE, 'Maple Grove Learning Group', RIVERSIDE, 'Riverside Community Health Collective'],
    );

    // 86 employees sits in the 50–199 band. The exact figure is intentionally not
    // stored (A-03); the band is what the product needs.
    await tx.query(
      `INSERT INTO organization_websites (id, organization_id, url, label, is_public)
       VALUES ($1, $3, 'https://maplegrove.example', 'Main site', true),
              ($2, $3, 'https://admissions.maplegrove.example', 'Admissions microsite', true)
       ON CONFLICT (id) DO NOTHING`,
      [id('e0001'), id('e0002'), MAPLE_GROVE],
    );

    for (const u of USERS) {
      await tx.query(
        `INSERT INTO users (id, email, display_name, preferred_language)
         VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.email, u.name, u.org === RIVERSIDE ? 'fr' : 'en'],
      );
      await tx.query(
        `INSERT INTO memberships (organization_id, user_id, role)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [u.org, u.id, u.role],
      );
    }

    // A December 2026 readiness project.
    const projectId = id('f0001');
    await tx.query(
      `INSERT INTO projects (id, organization_id, name, state, authorized_signer_user_id, target_date)
       VALUES ($1, $2, '2026 Readiness Assessment', 'active', $3, DATE '2026-12-31')
       ON CONFLICT (id) DO NOTHING`,
      [projectId, MAPLE_GROVE, id('c0002')],
    );

    // A published claim and one requirement derived from it, so the matrix has a
    // traceable source (CNT-001, CLP-005).
    const claimId = id('a1001');
    await tx.query(
      `INSERT INTO regulatory_claims
         (id, claim_key, version, jurisdiction, statement_en, statement_fr, source_url, source_title,
          effective_date, last_verified_at, next_review_at, reviewer_user_id, second_reviewer_user_id, status)
       VALUES ($1, 'on.reporting.deadline', 1, 'CA-ON',
               'Organizations with 20 or more employees in Ontario are required to file an accessibility compliance report by December 31, 2026.',
               NULL,
               'https://www.ontario.ca/page/completing-your-accessibility-compliance-report',
               'Ontario — Completing your accessibility compliance report',
               DATE '2026-01-01', DATE '2026-08-18', DATE '2026-11-01', $2, $3, 'published')
       ON CONFLICT (id) DO NOTHING`,
      [claimId, id('c0006'), id('c0005')],
    );

    const requirementId = id('a2001');
    await tx.query(
      `INSERT INTO requirements
         (id, organization_id, project_id, claim_id, claim_version, applicability, rationale, owner_user_id, reviewer_user_id)
       VALUES ($1, $2, $3, $4, 1, 'likely_applies',
               'Employee band 50-199 is above the 20-employee reporting threshold. Confirmed with the client during intake.',
               $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [requirementId, MAPLE_GROVE, projectId, claimId, id('c0001'), id('c0006')],
    );

    // Five evidence objects, one still in quarantine so the scanning state is
    // visible in the demo (ADR-0004).
    const evidenceIds = [id('b0001'), id('b0002'), id('b0003'), id('b0004'), id('b0005')];
    const evidenceRows: [string, string, string][] = [
      [evidenceIds[0]!, 'policy', 'clean'],
      [evidenceIds[1]!, 'training_record', 'clean'],
      [evidenceIds[2]!, 'report', 'clean'],
      [evidenceIds[3]!, 'contract', 'clean'],
      [evidenceIds[4]!, 'other', 'quarantined'],
    ];
    for (const [evId, classification, scanState] of evidenceRows) {
      await tx.query(
        `INSERT INTO evidence (id, organization_id, project_id, version, classification, scan_state, storage_key, retention_until)
         VALUES ($1, $2, $3, 1, $4, $5, $6, DATE '2033-12-31') ON CONFLICT (id) DO NOTHING`,
        [evId, MAPLE_GROVE, projectId, classification, scanState, `demo/${evId}`],
      );
    }

    // Four findings of mixed severity.
    const findings: [string, string, string, string][] = [
      [id('b1001'), 'critical', 'open', 'Admissions microsite form fields have no programmatic labels.'],
      [id('b1002'), 'serious', 'in_remediation', 'Main navigation is not operable by keyboard at the second level.'],
      [id('b1003'), 'moderate', 'awaiting_retest', 'Parent handbook PDF is untagged and has no reading order.'],
      [id('b1004'), 'minor', 'closed', 'Footer contrast falls slightly below 4.5:1 on the secondary background.'],
    ];
    for (const [fId, severity, state, summary] of findings) {
      await tx.query(
        `INSERT INTO findings (id, organization_id, project_id, severity, state, summary, requirement_id, reviewer_user_id, released)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false) ON CONFLICT (id) DO NOTHING`,
        [fId, MAPLE_GROVE, projectId, severity, state, summary, requirementId, id('c0006')],
      );
      await tx.query(
        `INSERT INTO finding_evidence (organization_id, finding_id, evidence_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [MAPLE_GROVE, fId, evidenceIds[0]],
      );
    }

    // One assigned audit contractor, scoped to two of the five evidence objects,
    // with an access expiry. The other three are deliberately out of scope so the
    // CTR-004 boundary is demonstrable in the demo.
    const assignmentId = id('b2001');
    await tx.query(
      `INSERT INTO assignments (id, organization_id, project_id, contractor_user_id, state, access_expires_at)
       VALUES ($1, $2, $3, $4, 'accepted', TIMESTAMPTZ '2026-12-15T00:00:00Z') ON CONFLICT (id) DO NOTHING`,
      [assignmentId, MAPLE_GROVE, projectId, id('c0004')],
    );
    for (const evId of [evidenceIds[0]!, evidenceIds[1]!]) {
      await tx.query(
        `INSERT INTO assignment_evidence (organization_id, assignment_id, evidence_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [MAPLE_GROVE, assignmentId, evId],
      );
    }

    // A deliverable in review — not released, because releasing requires a named
    // approver and a QA gate that arrives in CC-05.
    await tx.query(
      `INSERT INTO deliverables (id, organization_id, project_id, version, state, author_user_id, high_risk)
       VALUES ($1, $2, $3, 1, 'in_review', $4, true) ON CONFLICT (id) DO NOTHING`,
      [id('b3001'), MAPLE_GROVE, projectId, id('c0004')],
    );

    // Riverside gets a project of its own so cross-tenant queries have something
    // real to fail to find.
    await tx.query(
      `INSERT INTO projects (id, organization_id, name, state, target_date)
       VALUES ($1, $2, 'Évaluation de préparation 2026', 'active', DATE '2026-12-31')
       ON CONFLICT (id) DO NOTHING`,
      [id('f0002'), RIVERSIDE],
    );

    return {
      organizations: [
        { id: MAPLE_GROVE, name: 'Maple Grove Learning Group' },
        { id: RIVERSIDE, name: 'Riverside Community Health Collective' },
      ],
      users: USERS.map((u) => ({ id: u.id, email: u.email, role: u.role })),
    };
  });
}

export const DEMO_ORGANIZATION_IDS = { MAPLE_GROVE, RIVERSIDE } as const;
export const DEMO_PROJECT_ID = id('f0001');
export const DEMO_ASSIGNMENT_EVIDENCE = [id('b0001'), id('b0002')] as const;
export const DEMO_UNASSIGNED_EVIDENCE = [id('b0003'), id('b0004'), id('b0005')] as const;
