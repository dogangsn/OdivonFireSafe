import type { FireSafeRecord } from '../features/workspace/fire-safe.api';

const DAY = 86_400_000;
const DONE = new Set(['completed', 'closed']);

export interface LocationRisk {
  readonly location: string;
  readonly total: number;
  readonly overdue: number;
  readonly openNonconformities: number;
  readonly highRisk: number;
  /** 0–100, higher means more attention needed. */
  readonly score: number;
}
export interface MonthBucket {
  readonly key: string;
  readonly label: string;
  readonly count: number;
}
export interface FireSafeInsights {
  readonly total: number;
  readonly overdue: number;
  readonly dueSoon: number;
  readonly openNonconformities: number;
  readonly criticalNonconformities: number;
  readonly actionRequired: number;
  /** null when there is nothing to score yet. */
  readonly complianceScore: number | null;
  readonly agenda: readonly FireSafeRecord[];
  readonly locations: readonly LocationRisk[];
  readonly completions: readonly MonthBucket[];
}

export function isOpen(record: FireSafeRecord): boolean {
  return !DONE.has(record.status);
}

export function isOverdue(record: FireSafeRecord, now = Date.now()): boolean {
  if (!record.inspectionDueAt || !isOpen(record)) return false;
  return new Date(record.inspectionDueAt).getTime() < now;
}

function isDueWithin(record: FireSafeRecord, days: number, now: number): boolean {
  if (!record.inspectionDueAt || !isOpen(record)) return false;
  const due = new Date(record.inspectionDueAt).getTime();
  return due >= now && due <= now + days * DAY;
}

function isOpenNonconformity(record: FireSafeRecord): boolean {
  return record.kind === 'nonconformity' && isOpen(record);
}

function isHighRisk(record: FireSafeRecord): boolean {
  return record.riskLevel === 'high' || record.riskLevel === 'critical';
}

/**
 * A record is a compliance problem when its inspection is overdue, it is flagged
 * "action required", or it is an open high/critical nonconformity. Pending records
 * that are still on schedule are not penalised.
 */
export function hasComplianceIssue(record: FireSafeRecord, now = Date.now()): boolean {
  return (
    isOverdue(record, now) ||
    record.status === 'action-required' ||
    (isOpenNonconformity(record) && isHighRisk(record))
  );
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function buildInsights(
  records: readonly FireSafeRecord[],
  now = Date.now(),
): FireSafeInsights {
  const active = records.filter((record) => !record.archivedAt);
  const issues = active.filter((record) => hasComplianceIssue(record, now)).length;

  const agenda = active
    .filter((record) => isOverdue(record, now) || isDueWithin(record, 14, now))
    .sort((a, b) => a.inspectionDueAt!.localeCompare(b.inspectionDueAt!))
    .slice(0, 8);

  const byLocation = new Map<string, FireSafeRecord[]>();
  for (const record of active) {
    const key = record.location.trim() || 'Belirtilmemiş';
    byLocation.set(key, [...(byLocation.get(key) ?? []), record]);
  }
  const locations = [...byLocation.entries()]
    .map(([location, rows]): LocationRisk => {
      const overdue = rows.filter((row) => isOverdue(row, now)).length;
      const openNonconformities = rows.filter(isOpenNonconformity).length;
      const highRisk = rows.filter((row) => isOpen(row) && isHighRisk(row)).length;
      const flagged = rows.filter((row) => hasComplianceIssue(row, now)).length;
      return {
        location,
        total: rows.length,
        overdue,
        openNonconformities,
        highRisk,
        score: Math.round((flagged / rows.length) * 100),
      };
    })
    .sort((a, b) => b.score - a.score || b.total - a.total)
    .slice(0, 6);

  const current = new Date(now);
  const completions: MonthBucket[] = [];
  for (let offset = 11; offset >= 0; offset--) {
    const month = new Date(current.getFullYear(), current.getMonth() - offset, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    completions.push({ key, label: MONTHS[month.getMonth()], count: 0 });
  }
  const index = new Map(completions.map((bucket, i) => [bucket.key, i]));
  for (const record of records) {
    if (record.kind !== 'periodic-check' || !record.completedAt) continue;
    const date = new Date(record.completedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const i = index.get(key);
    if (i !== undefined) completions[i] = { ...completions[i], count: completions[i].count + 1 };
  }

  return {
    total: active.length,
    overdue: active.filter((record) => isOverdue(record, now)).length,
    dueSoon: active.filter((record) => isDueWithin(record, 30, now)).length,
    openNonconformities: active.filter(isOpenNonconformity).length,
    criticalNonconformities: active.filter(
      (record) => isOpenNonconformity(record) && record.riskLevel === 'critical',
    ).length,
    actionRequired: active.filter((record) => record.status === 'action-required').length,
    complianceScore: active.length
      ? Math.round(((active.length - issues) / active.length) * 100)
      : null,
    agenda,
    locations,
    completions,
  };
}
