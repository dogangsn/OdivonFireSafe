import { PRODUCT } from './product-manifest';

export interface DomainNavigationItem {
  readonly key: string;
  readonly path: string;
  readonly icon: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
}

const NAVIGATION: Record<string, readonly DomainNavigationItem[]> = {
  'fire-safe': [
    {
      key: 'equipment',
      path: 'equipment',
      icon: 'fire_extinguisher',
      label: 'Yangın Ekipmanları',
      title: 'Yangın Ekipmanları',
      description: 'Söndürücü, sprinkler, alarm ve pompa sistemlerinin envanterini yönetin.',
    },
    {
      key: 'periodic-checks',
      path: 'periodic-checks',
      icon: 'fact_check',
      label: 'Periyodik Kontroller',
      title: 'Periyodik Kontroller',
      description: 'Kontrol takvimlerini, bakım görevlerini ve saha kanıtlarını takip edin.',
    },
    {
      key: 'nonconformities',
      path: 'nonconformities',
      icon: 'warning',
      label: 'Uygunsuzluklar',
      title: 'Uygunsuzluk Yönetimi',
      description: 'Riskleri, düzeltici faaliyetleri ve kapanış sürelerini yönetin.',
    },
    {
      key: 'emergency-plans',
      path: 'emergency-plans',
      icon: 'emergency',
      label: 'Acil Durum Planları',
      title: 'Acil Durum Planları',
      description: 'Tahliye planları, tatbikatlar ve görevli ekip kayıtlarını yönetin.',
    },
    {
      key: 'reports',
      path: 'reports',
      icon: 'analytics',
      label: 'Denetim ve Raporlar',
      title: 'Denetim ve Raporlar',
      description: 'Lokasyon bazlı uygunluk raporları ve denetim paketleri hazırlayın.',
    },
  ],
};

export const PRODUCT_NAVIGATION = NAVIGATION[PRODUCT.key] ?? [];
