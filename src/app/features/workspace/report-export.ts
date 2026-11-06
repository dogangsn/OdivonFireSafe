import { KIND_LABELS, RISK_LABELS, STATUS_LABELS } from '../../domain/fire-safe-labels';
import type { FireSafeRecord } from './fire-safe.api';

interface ComplianceReport {
  readonly records?: FireSafeRecord[];
}

function save(content: BlobPart, type: string, name: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

const stamp = () => new Date().toISOString().slice(0, 10);
const date = (value: string | null) => (value ? new Date(value).toLocaleString('tr-TR') : '');

function cell(value: unknown): string {
  const text = String(value ?? '');
  // Quote every cell and neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function recordsToCsv(records: readonly FireSafeRecord[]): string {
  const header = [
    'Kayıt',
    'Tür',
    'Kod',
    'Lokasyon',
    'Tesis kodu',
    'Kategori',
    'Risk',
    'Durum',
    'Sonraki kontrol',
    'Tamamlanma',
    'Sorumlu',
    'Belgeler',
    'Notlar',
  ];
  const rows = records.map((r) => [
    r.name,
    KIND_LABELS[r.kind],
    r.code,
    r.location,
    r.facilityCode,
    r.category,
    r.riskLevel ? RISK_LABELS[r.riskLevel] : '',
    STATUS_LABELS[r.status],
    date(r.inspectionDueAt),
    date(r.completedAt),
    r.responsibleName,
    r.documentRefs.join(', '),
    r.notes,
  ]);
  // BOM + semicolon so Excel in Turkish locale opens it correctly.
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(';')).join('\r\n');
}

export function downloadReport(report: unknown, format: 'json' | 'csv') {
  if (format === 'json') {
    save(
      JSON.stringify(report, null, 2),
      'application/json',
      `firesafe-denetim-paketi-${stamp()}.json`,
    );
    return;
  }
  const records = (report as ComplianceReport | null)?.records ?? [];
  save(recordsToCsv(records), 'text/csv;charset=utf-8', `firesafe-kayitlar-${stamp()}.csv`);
}
