import type { FireSafeRecord } from '../features/workspace/fire-safe.api';
import { buildInsights, hasComplianceIssue, isOverdue } from './fire-safe-insights';

const NOW = new Date('2026-11-06T09:00:00Z').getTime();
const DAY = 86_400_000;
let seq = 0;
const record = (patch: Partial<FireSafeRecord>): FireSafeRecord => ({
  id: `r-${++seq}`,
  kind: 'equipment',
  name: 'Kayıt',
  location: 'Merkez',
  facilityCode: null,
  inspectionDueAt: null,
  code: null,
  category: null,
  riskLevel: null,
  responsibleName: null,
  completedAt: null,
  result: null,
  notes: null,
  documentRefs: [],
  status: 'pending',
  version: 1,
  updatedAt: '2026-11-01T00:00:00Z',
  archivedAt: null,
  ...patch,
});

describe('fire safe insights', () => {
  it('treats only open records past their due date as overdue', () => {
    const past = new Date(NOW - DAY).toISOString();
    expect(isOverdue(record({ inspectionDueAt: past }), NOW)).toBe(true);
    expect(isOverdue(record({ inspectionDueAt: past, status: 'completed' }), NOW)).toBe(false);
    expect(isOverdue(record({ inspectionDueAt: new Date(NOW + DAY).toISOString() }), NOW)).toBe(
      false,
    );
  });

  it('does not penalise pending records that are on schedule', () => {
    expect(hasComplianceIssue(record({ status: 'pending' }), NOW)).toBe(false);
    expect(hasComplianceIssue(record({ status: 'action-required' }), NOW)).toBe(true);
    expect(
      hasComplianceIssue(
        record({ kind: 'nonconformity', riskLevel: 'critical', status: 'active' }),
        NOW,
      ),
    ).toBe(true);
  });

  it('builds KPIs, agenda and location risk from records', () => {
    const insights = buildInsights(
      [
        record({ inspectionDueAt: new Date(NOW - 2 * DAY).toISOString(), location: 'Depo' }),
        record({ inspectionDueAt: new Date(NOW + 5 * DAY).toISOString() }),
        record({
          kind: 'nonconformity',
          riskLevel: 'critical',
          status: 'active',
          location: 'Depo',
        }),
        record({
          kind: 'periodic-check',
          status: 'completed',
          completedAt: '2026-10-15T10:00:00Z',
        }),
        record({ archivedAt: '2026-10-01T00:00:00Z', status: 'action-required' }),
      ],
      NOW,
    );
    expect(insights.total).toBe(4);
    expect(insights.overdue).toBe(1);
    expect(insights.dueSoon).toBe(1);
    expect(insights.openNonconformities).toBe(1);
    expect(insights.criticalNonconformities).toBe(1);
    expect(insights.complianceScore).toBe(50);
    expect(insights.agenda.map((row) => row.location)).toEqual(['Depo', 'Merkez']);
    expect(insights.locations[0]).toMatchObject({ location: 'Depo', score: 100 });
    expect(insights.completions.at(-2)?.count).toBe(1);
  });

  it('has no score without records', () => {
    expect(buildInsights([], NOW).complianceScore).toBeNull();
  });
});
