import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FireSafeApi, RecordDraft } from './fire-safe.api';
describe('FireSafeApi', () => {
  let api: FireSafeApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FireSafeApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('forwards record kind, archive and search filters', async () => {
    const result = api.list('equipment', false, 'pompa');
    const request = http.expectOne(
      (r) =>
        r.url === `${environment.apiBaseUrl}/fire-safe/records` &&
        r.params.get('kind') === 'equipment' &&
        r.params.get('archived') === 'false' &&
        r.params.get('search') === 'pompa',
    );
    request.flush({ data: { items: [] } });
    await expect(result).resolves.toEqual({ items: [] });
  });
  it('sends optimistic version and normalized evidence on update', async () => {
    const draft: RecordDraft = {
      kind: 'periodic-check',
      name: 'Pompa kontrolü',
      location: 'Merkez',
      facilityCode: 'F-1',
      inspectionDueAt: '',
      code: 'PC-1',
      category: 'Pompa',
      riskLevel: 'high',
      responsibleName: 'Ekip',
      completedAt: '',
      result: '',
      notes: '',
      documentRefsText: 'doc-1, doc-2',
      status: 'pending',
    };
    const result = api.update('r-1', 3, draft);
    const request = http.expectOne(`${environment.apiBaseUrl}/fire-safe/records/r-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.expectedVersion).toBe(3);
    expect(request.request.body.documentRefs).toEqual(['doc-1', 'doc-2']);
    request.flush({ data: { id: 'r-1' } });
    expect((await result).id).toBe('r-1');
  });
});
