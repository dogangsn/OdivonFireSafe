import { recordsToCsv } from './report-export';

describe('recordsToCsv', () => {
  it('quotes cells and neutralises spreadsheet formulas', () => {
    const csv = recordsToCsv([
      {
        id: '1',
        kind: 'equipment',
        name: '=HYPERLINK("x")',
        location: 'Depo "A"',
        facilityCode: null,
        inspectionDueAt: null,
        code: 'YT-1',
        category: null,
        riskLevel: 'high',
        responsibleName: null,
        completedAt: null,
        result: null,
        notes: null,
        documentRefs: ['R-1', 'F-2'],
        status: 'pending',
        version: 1,
        updatedAt: '2026-11-01T00:00:00Z',
        archivedAt: null,
      },
    ]);
    const [, row] = csv.split('\r\n');
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain('"Depo ""A"""');
    expect(row).toContain('"Yüksek"');
    expect(row).toContain('"R-1, F-2"');
  });
});
