import { Injectable, Pipe, PipeTransform, computed, inject, signal } from '@angular/core';
export type SupportedLang = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl' | 'ar';
export interface LanguageOption {
  readonly code: SupportedLang;
  readonly nativeName: string;
  readonly flag: string;
  readonly dir: 'ltr' | 'rtl';
}
export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'tr', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'en', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'it', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'nl', nativeName: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', flag: '🇦🇪', dir: 'rtl' },
];
const TR: Record<string, string> = {
  'nav.overview': 'Genel Bakış',
  'nav.modules': 'Modüller',
  'nav.activity': 'Aktiviteler',
  'nav.settings': 'Ayarlar',
  'nav.billing': 'Abonelik',
  'nav.equipment': 'Yangın Ekipmanları',
  'nav.periodic-checks': 'Periyodik Kontroller',
  'nav.nonconformities': 'Uygunsuzluklar',
  'nav.emergency-plans': 'Acil Durum Planları',
  'nav.reports': 'Denetim ve Raporlar',
  'common.search': 'Ad, kod veya açıklama ara…',
  'common.new': 'Yeni Kayıt',
  'common.active': 'Aktif',
  'common.archive': 'Arşiv',
  'common.save': 'Kaydet',
  'common.cancel': 'Vazgeç',
  'dashboard.live': 'Canlı Uyum Radarı',
  'dashboard.online': 'Çevrimiçi',
  'dashboard.health': 'Sistem Durumu',
  'dashboard.capacity': 'Tamamlanma',
  'dashboard.today': 'Bugünkü İşlem',
  'product.category': 'Yangın güvenliği ve saha denetimi',
  'product.tagline': 'Her kontrol kayıtlı, her tesis müdahaleye hazır.',
  'product.promise':
    'Ekipman, periyodik kontrol, uygunsuzluk ve acil durum kanıtlarını lokasyon bazında yönetin.',
  'metric.total': 'Takip edilen varlık',
  'metric.totalNote': '32 lokasyonda',
  'metric.active': 'Uyum skoru',
  'metric.activeNote': 'Aktif ekipman filosu',
  'metric.pending': 'Yaklaşan kontrol',
  'metric.pendingNote': 'Önümüzdeki 30 gün',
  'metric.score': 'Açık işlem',
  'metric.scoreNote': 'Teknisyen bekliyor',
  'module.title': 'Ürün Modülleri',
  'module.subtitle': 'Kontrollü fazlarla gelişen operasyon çalışma alanı',
  'module.one': 'Tesis envanteri',
  'module.oneDesc': 'Cihaz, lokasyon, gaz türü ve kapasite kaydı',
  'module.two': 'Ekipman kontrolleri',
  'module.twoDesc': 'Periyot, görev, sonuç ve kanıt takibi',
  'module.three': 'Uygunsuzluklar',
  'module.threeDesc': 'Dolum, geri kazanım ve stok hareketleri',
  'module.four': 'Acil durum paketi',
  'module.fourDesc': 'Müşteri ve ekipman bazlı dışa aktarım',
  'table.name': 'Kayıt',
  'table.status': 'Durum',
  'empty.title': 'Henüz kayıt yok',
  'empty.body': 'İlk kaydı oluşturarak iş akışını başlatın.',
  'update.title': 'Uygulama güncellemesi hazır',
  'update.body': 'Güvenli biçimde en güncel sürüme geçin.',
  'update.action': 'Şimdi Güncelle',
  'drawer.title': 'Yeni Kayıt Oluştur',
  'drawer.name': 'Kayıt adı',
};
const EN: Record<string, string> = {
  'nav.overview': 'Overview',
  'nav.modules': 'Modules',
  'nav.activity': 'Activity',
  'nav.settings': 'Settings',
  'nav.billing': 'Subscription',
  'nav.equipment': 'Fire Equipment',
  'nav.periodic-checks': 'Periodic Inspections',
  'nav.nonconformities': 'Nonconformities',
  'nav.emergency-plans': 'Emergency Plans',
  'nav.reports': 'Audits and Reports',
  'common.search': 'Search by name, code or description…',
  'common.new': 'New Record',
  'common.active': 'Active',
  'common.archive': 'Archive',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'dashboard.live': 'Live Compliance Radar',
  'dashboard.online': 'Online',
  'dashboard.health': 'System Status',
  'dashboard.capacity': 'Completion',
  'dashboard.today': 'Today',
  'module.title': 'Product Modules',
  'module.subtitle': 'An operational workspace evolving in controlled phases',
  'table.name': 'Record',
  'table.status': 'Status',
  'empty.title': 'No records yet',
  'empty.body': 'Create the first record to begin.',
  'update.title': 'Application update ready',
  'update.body': 'Move safely to the latest version.',
  'update.action': 'Update Now',
  'drawer.title': 'Create New Record',
  'drawer.name': 'Record name',
};
const DE = {
  'nav.overview': 'Übersicht',
  'nav.activity': 'Aktivitäten',
  'nav.settings': 'Einstellungen',
  'nav.billing': 'Abonnement',
  'nav.equipment': 'Brandschutzausrüstung',
  'nav.periodic-checks': 'Wiederkehrende Prüfungen',
  'nav.nonconformities': 'Abweichungen',
  'nav.emergency-plans': 'Notfallpläne',
  'nav.reports': 'Prüfungen und Berichte',
};
const FR = {
  'nav.overview': 'Vue d’ensemble',
  'nav.activity': 'Activités',
  'nav.settings': 'Paramètres',
  'nav.billing': 'Abonnement',
  'nav.equipment': 'Équipements incendie',
  'nav.periodic-checks': 'Contrôles périodiques',
  'nav.nonconformities': 'Non-conformités',
  'nav.emergency-plans': 'Plans d’urgence',
  'nav.reports': 'Audits et rapports',
};
const ES = {
  'nav.overview': 'Resumen',
  'nav.activity': 'Actividad',
  'nav.settings': 'Ajustes',
  'nav.billing': 'Suscripción',
  'nav.equipment': 'Equipos contra incendios',
  'nav.periodic-checks': 'Inspecciones periódicas',
  'nav.nonconformities': 'No conformidades',
  'nav.emergency-plans': 'Planes de emergencia',
  'nav.reports': 'Auditorías e informes',
};
const IT = {
  'nav.overview': 'Panoramica',
  'nav.activity': 'Attività',
  'nav.settings': 'Impostazioni',
  'nav.billing': 'Abbonamento',
  'nav.equipment': 'Attrezzature antincendio',
  'nav.periodic-checks': 'Controlli periodici',
  'nav.nonconformities': 'Non conformità',
  'nav.emergency-plans': 'Piani di emergenza',
  'nav.reports': 'Audit e report',
};
const NL = {
  'nav.overview': 'Overzicht',
  'nav.activity': 'Activiteit',
  'nav.settings': 'Instellingen',
  'nav.billing': 'Abonnement',
  'nav.equipment': 'Brandveiligheidsmiddelen',
  'nav.periodic-checks': 'Periodieke controles',
  'nav.nonconformities': 'Afwijkingen',
  'nav.emergency-plans': 'Noodplannen',
  'nav.reports': 'Audits en rapporten',
};
const AR = {
  'nav.overview': 'نظرة عامة',
  'nav.activity': 'الأنشطة',
  'nav.settings': 'الإعدادات',
  'nav.billing': 'الاشتراك',
  'nav.equipment': 'معدات الحريق',
  'nav.periodic-checks': 'الفحوصات الدورية',
  'nav.nonconformities': 'حالات عدم المطابقة',
  'nav.emergency-plans': 'خطط الطوارئ',
  'nav.reports': 'التدقيق والتقارير',
};
const DICTS: Partial<Record<SupportedLang, Record<string, string>>> = {
  tr: TR,
  en: EN,
  de: DE,
  fr: FR,
  es: ES,
  it: IT,
  nl: NL,
  ar: AR,
};
@Injectable({ providedIn: 'root' })
export class I18nStore {
  readonly currentLang = signal<SupportedLang>(this.initial());
  readonly options = LANGUAGES;
  readonly active = computed(
    () => LANGUAGES.find((x) => x.code === this.currentLang()) ?? LANGUAGES[0],
  );
  setLanguage(lang: SupportedLang): void {
    this.currentLang.set(lang);
    localStorage.setItem('odivon:preferred_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = this.active().dir;
    document.documentElement.classList.toggle('rtl', this.active().dir === 'rtl');
  }
  t(key: string): string {
    return DICTS[this.currentLang()]?.[key] ?? TR[key] ?? key;
  }
  private initial(): SupportedLang {
    const value = localStorage.getItem('odivon:preferred_lang') as SupportedLang | null;
    return LANGUAGES.some((x) => x.code === value) ? value! : 'tr';
  }
}
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nStore);
  transform(key: string): string {
    this.i18n.currentLang();
    return this.i18n.t(key);
  }
}
