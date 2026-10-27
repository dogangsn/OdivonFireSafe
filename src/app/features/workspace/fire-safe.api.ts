import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorDetails } from '../../core/api/api-error';

interface Envelope<T> {
  readonly data: T;
}
export type FireSafeKind = 'equipment' | 'periodic-check' | 'nonconformity' | 'emergency-plan';
export type FireSafeStatus = 'active' | 'pending' | 'completed' | 'action-required' | 'closed';
export interface FireSafeRecord {
  readonly id: string;
  readonly kind: FireSafeKind;
  readonly name: string;
  readonly location: string;
  readonly facilityCode: string | null;
  readonly inspectionDueAt: string | null;
  readonly code: string | null;
  readonly category: string | null;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  readonly responsibleName: string | null;
  readonly completedAt: string | null;
  readonly result: 'pass' | 'conditional' | 'fail' | null;
  readonly notes: string | null;
  readonly documentRefs: string[];
  readonly status: FireSafeStatus;
  readonly version: number;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}
export interface FireSafeDashboard {
  readonly total: number;
  readonly equipment: number;
  readonly checks: number;
  readonly openNonconformities: number;
  readonly emergencyPlans: number;
  readonly dueSoon: number;
  readonly actionRequired: number;
  readonly complianceScore: number;
}
export interface RecordDraft {
  kind: FireSafeKind;
  name: string;
  location: string;
  facilityCode: string;
  inspectionDueAt: string;
  code: string;
  category: string;
  riskLevel: '' | 'low' | 'medium' | 'high' | 'critical';
  responsibleName: string;
  completedAt: string;
  result: '' | 'pass' | 'conditional' | 'fail';
  notes: string;
  documentRefsText: string;
  status: FireSafeStatus;
}
@Injectable({ providedIn: 'root' })
export class FireSafeApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/fire-safe`;
  list(kind: FireSafeKind | null, archived: boolean, search: string) {
    let params = new HttpParams().set('archived', archived).set('limit', 100);
    if (kind) params = params.set('kind', kind);
    if (search.trim()) params = params.set('search', search.trim());
    return this.request(
      this.http.get<Envelope<{ items: FireSafeRecord[] }>>(`${this.base}/records`, { params }),
    );
  }
  dashboard() {
    return this.request(this.http.get<Envelope<FireSafeDashboard>>(`${this.base}/dashboard`));
  }
  create(draft: RecordDraft) {
    return this.request(
      this.http.post<Envelope<FireSafeRecord>>(`${this.base}/records`, this.payload(draft)),
    );
  }
  update(id: string, version: number, draft: RecordDraft) {
    return this.request(
      this.http.patch<Envelope<FireSafeRecord>>(`${this.base}/records/${encodeURIComponent(id)}`, {
        ...this.payload(draft),
        expectedVersion: version,
      }),
    );
  }
  archive(id: string) {
    return this.request(
      this.http.delete<Envelope<FireSafeRecord>>(`${this.base}/records/${encodeURIComponent(id)}`),
    );
  }
  restore(id: string) {
    return this.request(
      this.http.post<Envelope<FireSafeRecord>>(
        `${this.base}/records/${encodeURIComponent(id)}/restore`,
        {},
      ),
    );
  }
  report() {
    return this.request(this.http.get<Envelope<unknown>>(`${this.base}/reports/compliance`));
  }
  private payload(draft: RecordDraft) {
    return {
      ...draft,
      facilityCode: draft.facilityCode || undefined,
      inspectionDueAt: draft.inspectionDueAt || undefined,
      code: draft.code || undefined,
      category: draft.category || undefined,
      riskLevel: draft.riskLevel || undefined,
      responsibleName: draft.responsibleName || undefined,
      completedAt: draft.completedAt || undefined,
      result: draft.result || undefined,
      notes: draft.notes || undefined,
      documentRefs: draft.documentRefsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      documentRefsText: undefined,
    };
  }
  private async request<T>(source: Observable<Envelope<T>>): Promise<T> {
    try {
      return (await firstValueFrom(source)).data;
    } catch (error) {
      if (error instanceof HttpErrorResponse)
        throw new Error(apiErrorDetails(error, 'MainAPI isteği tamamlanamadı.').message);
      throw error;
    }
  }
}
