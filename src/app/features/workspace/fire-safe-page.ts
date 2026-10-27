import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { PRODUCT_NAVIGATION } from '../../domain/domain-navigation';
import { PageHeader } from '../../shared/ui/page-header';
import { SlideOver } from '../../shared/ui/slide-over';
import {
  FireSafeApi,
  FireSafeDashboard,
  FireSafeKind,
  FireSafeRecord,
  RecordDraft,
} from './fire-safe.api';

const KINDS: Record<string, FireSafeKind> = {
  equipment: 'equipment',
  'periodic-checks': 'periodic-check',
  nonconformities: 'nonconformity',
  'emergency-plans': 'emergency-plan',
  reports: 'periodic-check',
};
const emptyDraft = (kind: FireSafeKind): RecordDraft => ({
  kind,
  name: '',
  location: '',
  facilityCode: '',
  inspectionDueAt: '',
  code: '',
  category: '',
  riskLevel: '',
  responsibleName: '',
  completedAt: '',
  result: '',
  notes: '',
  documentRefsText: '',
  status: 'pending',
});

@Component({
  selector: 'app-fire-safe-page',
  imports: [PageHeader, SlideOver, DatePipe],
  template: `
    <div class="space-y-6">
      <app-page-header
        eyebrow="YANGIN GÜVENLİĞİ OPERASYON MERKEZİ"
        [title]="title"
        [description]="description"
      >
        <div actions class="flex flex-wrap gap-2">
          <button type="button" class="odv-btn-soft" (click)="downloadReport()">
            <span class="material-symbols-rounded">download</span>Denetim paketi
          </button>
          @if (!overview) {
            <button type="button" class="odv-btn-primary" (click)="openCreate()">
              <span class="material-symbols-rounded">add</span>Yeni kayıt
            </button>
          }
        </div>
      </app-page-header>

      @if (error()) {
        <div class="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700" role="alert">
          {{ error() }} <button class="ms-3 underline" (click)="load()">Tekrar dene</button>
        </div>
      }
      @if (overview) {
        <section
          class="odv-card overflow-hidden bg-gradient-to-br from-slate-950 via-rose-950 to-violet-950 p-7 text-white lg:p-9"
        >
          <div class="grid gap-7 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <span class="odv-badge-success">CANLI UYUM RADARI</span>
              <h2 class="mb-3 mt-5 text-3xl font-black">Tesis riskleri tek merkezde</h2>
              <p class="m-0 max-w-2xl text-sm leading-7 text-slate-300">
                Ekipman, kontrol, uygunsuzluk ve acil durum planlarını değişmez denetim iziyle
                yönetin.
              </p>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="rounded-2xl bg-white/10 p-4">
                <strong class="block text-3xl">%{{ dashboard()?.complianceScore ?? 100 }}</strong
                ><span class="text-xs text-slate-300">Uyum</span>
              </div>
              <div class="rounded-2xl bg-white/10 p-4">
                <strong class="block text-3xl">{{ dashboard()?.dueSoon ?? 0 }}</strong
                ><span class="text-xs text-slate-300">30 gün</span>
              </div>
              <div class="rounded-2xl bg-white/10 p-4">
                <strong class="block text-3xl">{{ dashboard()?.actionRequired ?? 0 }}</strong
                ><span class="text-xs text-slate-300">Aksiyon</span>
              </div>
            </div>
          </div>
        </section>
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (metric of metrics(); track metric.label) {
            <article class="odv-card p-5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black uppercase tracking-wider text-slate-500">{{
                  metric.label
                }}</span
                ><span class="material-symbols-rounded text-violet-600">{{ metric.icon }}</span>
              </div>
              <strong class="mt-4 block text-4xl font-black">{{ metric.value }}</strong
              ><span class="mt-2 block text-xs text-slate-500">{{ metric.note }}</span>
            </article>
          }
        </section>
      }

      <section class="odv-card overflow-hidden">
        <div
          class="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            <button
              class="rounded-lg px-4 py-2 text-xs font-bold"
              [class.bg-white]="!archived()"
              (click)="setArchived(false)"
            >
              Aktif</button
            ><button
              class="rounded-lg px-4 py-2 text-xs font-bold"
              [class.bg-white]="archived()"
              (click)="setArchived(true)"
            >
              Arşiv
            </button>
          </div>
          <label class="relative block lg:w-96"
            ><span class="sr-only">Kayıt ara</span
            ><span
              class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
              >search</span
            ><input
              class="odv-input ps-10"
              type="search"
              placeholder="Ad, kod, lokasyon veya sorumlu ara…"
              [value]="search()"
              (input)="search.set($any($event.target).value); scheduleLoad()"
          /></label>
        </div>
        @if (loading()) {
          <div class="grid min-h-64 place-items-center">
            <span class="material-symbols-rounded animate-spin text-4xl text-violet-600"
              >progress_activity</span
            >
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[940px]">
              <thead>
                <tr>
                  <th class="odv-th">Kayıt</th>
                  <th class="odv-th">Tür</th>
                  <th class="odv-th">Lokasyon</th>
                  <th class="odv-th">Risk</th>
                  <th class="odv-th">Kontrol tarihi</th>
                  <th class="odv-th">Durum</th>
                  <th class="odv-th"><span class="sr-only">İşlem</span></th>
                </tr>
              </thead>
              <tbody>
                @for (row of records(); track row.id) {
                  <tr class="hover:bg-violet-50/50 dark:hover:bg-slate-800">
                    <td class="odv-td">
                      <strong class="block">{{ row.name }}</strong
                      ><span class="text-xs text-slate-500">{{
                        row.code || row.facilityCode || 'Kod yok'
                      }}</span>
                    </td>
                    <td class="odv-td">{{ kindLabel(row.kind) }}</td>
                    <td class="odv-td">{{ row.location }}</td>
                    <td class="odv-td">
                      <span [class]="riskClass(row.riskLevel)">{{ riskLabel(row.riskLevel) }}</span>
                    </td>
                    <td class="odv-td">
                      {{ row.inspectionDueAt ? (row.inspectionDueAt | date: 'dd.MM.yyyy') : '—' }}
                    </td>
                    <td class="odv-td">
                      <span [class]="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
                    </td>
                    <td class="odv-td text-end">
                      <button class="odv-icon-btn" aria-label="Kaydı aç" (click)="openEdit(row)">
                        <span class="material-symbols-rounded">edit</span>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="p-12 text-center">
                      <span class="material-symbols-rounded text-5xl text-slate-300"
                        >fire_extinguisher</span
                      ><strong class="mt-3 block">Bu görünümde kayıt yok</strong
                      ><span class="text-sm text-slate-500"
                        >İlk kaydı oluşturarak izlenebilirliği başlatın.</span
                      >
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>

    <app-slide-over
      [open]="drawerOpen()"
      [wide]="true"
      [dirty]="dirty()"
      [submitting]="saving()"
      [title]="editing() ? 'Kaydı düzenle' : 'Yeni yangın güvenliği kaydı'"
      eyebrow="KANITLI OPERASYON KAYDI"
      icon="fire_extinguisher"
      submitLabel="Kaydet"
      (closed)="drawerOpen.set(false)"
      (submitted)="save()"
    >
      @if (saveError()) {
        <div class="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700" role="alert">
          {{ saveError() }}
        </div>
      }
      <section class="odv-card p-5">
        <h3 class="mt-0">Temel bilgiler</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <label
            ><span class="mb-1 block text-xs font-bold">Kayıt türü *</span
            ><select
              class="odv-input"
              [value]="draft().kind"
              (change)="patch('kind', $any($event.target).value)"
            >
              <option value="equipment">Yangın ekipmanı</option>
              <option value="periodic-check">Periyodik kontrol</option>
              <option value="nonconformity">Uygunsuzluk</option>
              <option value="emergency-plan">Acil durum planı</option>
            </select></label
          >
          <label
            ><span class="mb-1 block text-xs font-bold">Durum *</span
            ><select
              class="odv-input"
              [value]="draft().status"
              (change)="patch('status', $any($event.target).value)"
            >
              <option value="pending">Bekliyor</option>
              <option value="active">Aktif</option>
              <option value="action-required">Aksiyon gerekli</option>
              <option value="completed">Tamamlandı</option>
              <option value="closed">Kapalı</option>
            </select></label
          >
          <label class="sm:col-span-2"
            ><span class="mb-1 block text-xs font-bold">Kayıt adı *</span
            ><input
              class="odv-input"
              [value]="draft().name"
              (input)="patch('name', $any($event.target).value)"
          /></label>
          <label
            ><span class="mb-1 block text-xs font-bold">Lokasyon *</span
            ><input
              class="odv-input"
              [value]="draft().location"
              (input)="patch('location', $any($event.target).value)"
          /></label>
          <label
            ><span class="mb-1 block text-xs font-bold">Tesis kodu</span
            ><input
              class="odv-input"
              [value]="draft().facilityCode"
              (input)="patch('facilityCode', $any($event.target).value)"
          /></label>
          <label
            ><span class="mb-1 block text-xs font-bold">Ekipman / rapor kodu</span
            ><input
              class="odv-input"
              [value]="draft().code"
              (input)="patch('code', $any($event.target).value)"
          /></label>
          <label
            ><span class="mb-1 block text-xs font-bold">Kategori</span
            ><input
              class="odv-input"
              [value]="draft().category"
              (input)="patch('category', $any($event.target).value)"
          /></label>
        </div>
      </section>
      <section class="odv-card p-5">
        <h3 class="mt-0">Risk, tarih ve sorumluluk</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <label
            ><span class="mb-1 block text-xs font-bold">Risk seviyesi</span
            ><select
              class="odv-input"
              [value]="draft().riskLevel"
              (change)="patch('riskLevel', $any($event.target).value)"
            >
              <option value="">Seçilmedi</option>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
              <option value="critical">Kritik</option>
            </select></label
          >
          <label
            ><span class="mb-1 block text-xs font-bold">Sorumlu kişi</span
            ><input
              class="odv-input"
              [value]="draft().responsibleName"
              (input)="patch('responsibleName', $any($event.target).value)"
          /></label>
          <label
            ><span class="mb-1 block text-xs font-bold">Sonraki kontrol</span
            ><input
              class="odv-input"
              type="datetime-local"
              [value]="draft().inspectionDueAt"
              (input)="patch('inspectionDueAt', $any($event.target).value)"
          /></label>
          <label
            ><span class="mb-1 block text-xs font-bold">Tamamlanma tarihi</span
            ><input
              class="odv-input"
              type="datetime-local"
              [value]="draft().completedAt"
              (input)="patch('completedAt', $any($event.target).value)"
          /></label>
          <label
            ><span class="mb-1 block text-xs font-bold">Kontrol sonucu</span
            ><select
              class="odv-input"
              [value]="draft().result"
              (change)="patch('result', $any($event.target).value)"
            >
              <option value="">Seçilmedi</option>
              <option value="pass">Uygun</option>
              <option value="conditional">Şartlı uygun</option>
              <option value="fail">Uygun değil</option>
            </select></label
          >
          <label
            ><span class="mb-1 block text-xs font-bold">Belge referansları</span
            ><input
              class="odv-input"
              placeholder="Rapor-24, Foto-18"
              [value]="draft().documentRefsText"
              (input)="patch('documentRefsText', $any($event.target).value)"
          /></label>
          <label class="sm:col-span-2"
            ><span class="mb-1 block text-xs font-bold">Bulgular ve düzeltici faaliyet</span
            ><textarea
              class="odv-input min-h-28"
              [value]="draft().notes"
              (input)="patch('notes', $any($event.target).value)"
            ></textarea>
          </label>
        </div>
      </section>
      @if (editing(); as row) {
        <div class="flex justify-between">
          <button type="button" class="odv-btn-ghost text-rose-600" (click)="toggleArchive(row)">
            {{ row.archivedAt ? 'Arşivden çıkar' : 'Arşivle' }}</button
          ><span class="text-xs text-slate-500"
            >Sürüm {{ row.version }} · değişiklikler audit kaydına işlenir</span
          >
        </div>
      }
    </app-slide-over>
  `,
})
export class FireSafePage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(FireSafeApi);
  readonly overview = this.route.snapshot.data['view'] === 'overview';
  private readonly section = String(this.route.snapshot.data['section'] ?? '');
  readonly kind = this.overview ? null : (KINDS[this.section] ?? 'equipment');
  readonly domain = PRODUCT_NAVIGATION.find((item) => item.key === this.section);
  readonly title = this.overview
    ? 'FireSafe Genel Bakış'
    : (this.domain?.title ?? 'Yangın Güvenliği Kayıtları');
  readonly description = this.overview
    ? 'Tesis, ekipman, kontrol ve uygunsuzluk risklerini canlı operasyon verileriyle yönetin.'
    : (this.domain?.description ?? 'Denetlenebilir yangın güvenliği kayıtları.');
  readonly records = signal<FireSafeRecord[]>([]);
  readonly dashboard = signal<FireSafeDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly archived = signal(false);
  readonly drawerOpen = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly editing = signal<FireSafeRecord | null>(null);
  readonly draft = signal<RecordDraft>(emptyDraft(this.kind ?? 'equipment'));
  readonly dirty = signal(false);
  private timer?: ReturnType<typeof setTimeout>;
  readonly metrics = computed(() => {
    const d = this.dashboard();
    return [
      {
        label: 'Toplam kayıt',
        value: d?.total ?? 0,
        icon: 'inventory_2',
        note: 'Aktif güvenlik kanıtları',
      },
      {
        label: 'Yangın ekipmanı',
        value: d?.equipment ?? 0,
        icon: 'fire_extinguisher',
        note: 'Takip edilen ekipman',
      },
      {
        label: 'Açık uygunsuzluk',
        value: d?.openNonconformities ?? 0,
        icon: 'warning',
        note: 'Kapanış bekleyen risk',
      },
      {
        label: 'Acil durum planı',
        value: d?.emergencyPlans ?? 0,
        icon: 'emergency',
        note: 'Yürürlükteki planlar',
      },
    ];
  });
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [list, dashboard] = await Promise.all([
        this.api.list(this.kind, this.archived(), this.search()),
        this.api.dashboard(),
      ]);
      this.records.set(list.items);
      this.dashboard.set(dashboard);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Kayıtlar alınamadı.');
    } finally {
      this.loading.set(false);
    }
  }
  scheduleLoad() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(), 250);
  }
  setArchived(value: boolean) {
    this.archived.set(value);
    void this.load();
  }
  openCreate() {
    this.editing.set(null);
    this.draft.set(emptyDraft(this.kind ?? 'equipment'));
    this.dirty.set(false);
    this.saveError.set('');
    this.drawerOpen.set(true);
  }
  openEdit(row: FireSafeRecord) {
    this.editing.set(row);
    this.draft.set({
      kind: row.kind,
      name: row.name,
      location: row.location,
      facilityCode: row.facilityCode ?? '',
      inspectionDueAt: this.localDate(row.inspectionDueAt),
      code: row.code ?? '',
      category: row.category ?? '',
      riskLevel: row.riskLevel ?? '',
      responsibleName: row.responsibleName ?? '',
      completedAt: this.localDate(row.completedAt),
      result: row.result ?? '',
      notes: row.notes ?? '',
      documentRefsText: row.documentRefs.join(', '),
      status: row.status,
    });
    this.dirty.set(false);
    this.saveError.set('');
    this.drawerOpen.set(true);
  }
  patch<K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
    this.dirty.set(true);
  }
  async save() {
    const draft = this.draft();
    if (!draft.name.trim() || !draft.location.trim()) {
      this.saveError.set('Kayıt adı ve lokasyon zorunludur.');
      return;
    }
    this.saving.set(true);
    this.saveError.set('');
    try {
      const row = this.editing();
      if (row) await this.api.update(row.id, row.version, draft);
      else await this.api.create(draft);
      this.dirty.set(false);
      this.drawerOpen.set(false);
      await this.load();
    } catch (e) {
      this.saveError.set(e instanceof Error ? e.message : 'Kayıt kaydedilemedi.');
    } finally {
      this.saving.set(false);
    }
  }
  async toggleArchive(row: FireSafeRecord) {
    const result = await Swal.fire({
      title: row.archivedAt ? 'Kayıt geri açılsın mı?' : 'Kayıt arşivlensin mi?',
      text: 'İşlem denetim izine kaydedilecektir.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Onayla',
      cancelButtonText: 'Vazgeç',
      customClass: { confirmButton: 'odv-btn-primary', cancelButton: 'odv-btn-ghost' },
      buttonsStyling: false,
    });
    if (!result.isConfirmed) return;
    if (row.archivedAt) await this.api.restore(row.id);
    else await this.api.archive(row.id);
    this.dirty.set(false);
    this.drawerOpen.set(false);
    await this.load();
  }
  async downloadReport() {
    try {
      const report = await this.api.report();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `firesafe-denetim-paketi-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Rapor oluşturulamadı.');
    }
  }
  kindLabel(kind: FireSafeKind) {
    return (
      {
        equipment: 'Yangın ekipmanı',
        'periodic-check': 'Periyodik kontrol',
        nonconformity: 'Uygunsuzluk',
        'emergency-plan': 'Acil durum planı',
      } as const
    )[kind];
  }
  riskLabel(risk: FireSafeRecord['riskLevel']) {
    return risk
      ? ({ low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik' } as const)[risk]
      : 'Belirtilmedi';
  }
  riskClass(risk: FireSafeRecord['riskLevel']) {
    return risk === 'critical' || risk === 'high'
      ? 'odv-badge-danger'
      : risk === 'medium'
        ? 'odv-badge-warning'
        : 'odv-badge-success';
  }
  statusLabel(status: FireSafeRecord['status']) {
    return (
      {
        active: 'Aktif',
        pending: 'Bekliyor',
        completed: 'Tamamlandı',
        'action-required': 'Aksiyon gerekli',
        closed: 'Kapalı',
      } as const
    )[status];
  }
  statusClass(status: FireSafeRecord['status']) {
    return status === 'action-required'
      ? 'odv-badge-danger'
      : status === 'pending'
        ? 'odv-badge-warning'
        : 'odv-badge-success';
  }
  private localDate(value: string | null) {
    return value ? value.slice(0, 16) : '';
  }
}
