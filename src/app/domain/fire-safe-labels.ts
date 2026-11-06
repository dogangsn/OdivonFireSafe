import type {
  FireSafeKind,
  FireSafeRecord,
  FireSafeStatus,
} from '../features/workspace/fire-safe.api';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type Risk = NonNullable<FireSafeRecord['riskLevel']>;

export const KIND_LABELS: Record<FireSafeKind, string> = {
  equipment: 'Yangın ekipmanı',
  'periodic-check': 'Periyodik kontrol',
  nonconformity: 'Uygunsuzluk',
  'emergency-plan': 'Acil durum planı',
};
export const KIND_ICONS: Record<FireSafeKind, string> = {
  equipment: 'fire_extinguisher',
  'periodic-check': 'fact_check',
  nonconformity: 'warning',
  'emergency-plan': 'emergency',
};
export const KIND_PATHS: Record<FireSafeKind, string> = {
  equipment: '/equipment',
  'periodic-check': '/periodic-checks',
  nonconformity: '/nonconformities',
  'emergency-plan': '/emergency-plans',
};
export const STATUS_LABELS: Record<FireSafeStatus, string> = {
  active: 'Aktif',
  pending: 'Bekliyor',
  completed: 'Tamamlandı',
  'action-required': 'Aksiyon gerekli',
  closed: 'Kapalı',
};
export const STATUS_TONES: Record<FireSafeStatus, BadgeTone> = {
  active: 'info',
  pending: 'warning',
  completed: 'success',
  'action-required': 'danger',
  closed: 'neutral',
};
export const RISK_LABELS: Record<Risk, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};
export const RISK_TONES: Record<Risk, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export function badgeClass(tone: BadgeTone): string {
  return `odv-badge-${tone}`;
}
