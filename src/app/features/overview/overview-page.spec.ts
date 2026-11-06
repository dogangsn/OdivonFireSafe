import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { FireSafeApi, FireSafeRecord } from '../workspace/fire-safe.api';
import { OverviewPage } from './overview-page';

const overdue: FireSafeRecord = {
  id: 'r-1',
  kind: 'periodic-check',
  name: 'Sprinkler pompası',
  location: 'Ana depo',
  facilityCode: null,
  inspectionDueAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  code: 'SP-1',
  category: null,
  riskLevel: 'high',
  responsibleName: null,
  completedAt: null,
  result: null,
  notes: null,
  documentRefs: [],
  status: 'pending',
  version: 2,
  updatedAt: '2026-11-01T00:00:00Z',
  archivedAt: null,
};

describe('OverviewPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewPage],
      providers: [
        provideRouter([]),
        {
          provide: FireSafeApi,
          useValue: {
            listAll: async () => ({ items: [overdue], truncated: false }),
            dashboard: async () => ({ equipment: 0, emergencyPlans: 0 }),
            audit: async () => [],
            report: async () => ({}),
          },
        },
      ],
    }).compileComponents();
  });

  it('shows live KPIs and the overdue agenda without blocking a11y issues', async () => {
    const fixture = TestBed.createComponent(OverviewPage);
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Sprinkler pompası');
    expect(element.textContent).toContain('3 gün gecikti');
    expect(element.textContent).toContain('%0');
    const result = await axe.run(element, {
      resultTypes: ['violations'],
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(
      result.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });
});
