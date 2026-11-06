import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { toLocalInput } from '../../core/time/local-datetime';
import { PRODUCT_NAVIGATION } from '../../domain/domain-navigation';
import { isOverdue } from '../../domain/fire-safe-insights';
import {
  KIND_ICONS,
  KIND_LABELS,
  RISK_LABELS,
  RISK_TONES,
  STATUS_LABELS,
  STATUS_TONES,
  badgeClass,
} from '../../domain/fire-safe-labels';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { SlideOver } from '../../shared/ui/slide-over';
import {
  FireSafeApi,
  FireSafeKind,
  FireSafeRecord,
  FireSafeStatus,
  RecordDraft,
} from './fire-safe.api';
import { downloadReport } from './report-export';

/** Route section → record kind. `reports` lists every kind. */
const KINDS: Record<string, FireSafeKind | null> = {
  equipment: 'equipment',
  'periodic-checks': 'periodic-check',
  nonconformities: 'nonconformity',
  'emergency-plans': 'emergency-plan',
  reports: null,
};
const STATUS_FILTERS: readonly (FireSafeStatus | null)[] = [
  null,
  'pending',
  'active',
  'action-required',
  'completed',
  'closed',
];
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
  imports: [PageHeader, SlideOver, EmptyState, DatePipe],
  template: `
    <div class="space-y-5">
      <app-page-header
        [eyebrow]="reports ? 'DENETİME HAZIR KAYITLAR' : 'YANGIN GÜVENLİĞİ KAYITLARI'"
        [icon]="domain?.icon ?? 'inventory_2'"
        [title]="title"
        [description]="description"
      >
        <div actions class="flex flex-wrap gap-2">
          @if (reports) {
            <button
              type="button"
              class="odv-btn-ghost"
              (click)="exportReport('csv')"
              [disabled]="exporting()"
            >
              <span class="material-symbols-rounded" aria-hidden="true">table_view</span>Excel (CSV)
            </button>
            <button
              type="button"
              class="odv-btn-primary"
              (click)="exportReport('json')"
              [disabled]="exporting()"
            >
              <span class="material-symbols-rounded" aria-hidden="true">download</span>Denetim
              paketi
            </button>
          } @else {
            <button type="button" class="odv-btn-primary" (click)="openCreate()">
              <span class="material-symbols-rounded" aria-hidden="true">add</span>Yeni kayıt
            </button>
          }
        </div>
      </app-page-header>

      @if (error()) {
        <div
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          role="alert"
        >
          {{ error() }}
          <button type="button" class="odv-btn-ghost !min-h-9" (click)="load()">Tekrar dene</button>
        </div>
      }

      <!-- Filter bar -->
      <section
        class="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        aria-label="Filtreler"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label class="relative block flex-1">
            <span class="sr-only">Kayıt ara</span>
            <span
              class="material-symbols-rounded pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
              >search</span
            >
            <input
              class="odv-input !bg-slate-50 ps-10 dark:!bg-slate-800/60"
              type="search"
              placeholder="Ad, kod, lokasyon veya sorumlu ara…"
              [value]="search()"
              (input)="search.set($any($event.target).value); scheduleLoad()"
            />
          </label>
          <div
            class="inline-flex shrink-0 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
            role="group"
            aria-label="Kayıt görünümü"
          >
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
              [class]="
                !archived()
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : ''
              "
              [attr.aria-pressed]="!archived()"
              (click)="setArchived(false)"
            >
              Aktif
            </button>
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
              [class]="
                archived()
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : ''
              "
              [attr.aria-pressed]="archived()"
              (click)="setArchived(true)"
            >
              Arşiv
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Durum filtresi">
          @for (status of statusFilters; track status) {
            <button
              type="button"
              class="odv-chip"
              [attr.aria-pressed]="statusFilter() === status"
              (click)="setStatus(status)"
            >
              {{ status ? statusLabel(status) : 'Tümü' }}
            </button>
          }
          <button
            type="button"
            class="odv-chip"
            [attr.aria-pressed]="overdueOnly()"
            (click)="overdueOnly.update((v) => !v)"
          >
            <span class="material-symbols-rounded !text-base text-rose-500" aria-hidden="true"
              >event_busy</span
            >
            Süresi geçmiş
          </button>
        </div>
      </section>

      <section class="odv-card overflow-hidden" aria-label="Kayıtlar">
        <div
          class="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800"
        >
          <span>
            @if (!loading()) {
              <strong class="text-slate-900 dark:text-white">{{ visible().length }}</strong> kayıt
              gösteriliyor
            }
          </span>
          @if (overdueCount()) {
            <span class="odv-badge-danger">{{ overdueCount() }} kontrolün süresi geçmiş</span>
          }
        </div>
        @if (loading()) {
          <div class="space-y-3 p-5" aria-busy="true" aria-label="Yükleniyor">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <span class="odv-skeleton block h-14"></span>
            }
          </div>
        } @else if (!visible().length) {
          <app-empty-state
            [icon]="domain?.icon ?? 'inventory_2'"
            [title]="hasFilters() ? 'Filtrelere uyan kayıt yok' : 'Bu görünümde kayıt yok'"
            [body]="
              hasFilters()
                ? 'Arama veya filtreleri değiştirerek tekrar deneyin.'
                : 'İlk kaydı oluşturarak izlenebilirliği başlatın.'
            "
          >
            @if (hasFilters()) {
              <button type="button" class="odv-btn-soft" (click)="clearFilters()">
                Filtreleri temizle
              </button>
            } @else if (!reports && !archived()) {
              <button type="button" class="odv-btn-primary" (click)="openCreate()">
                <span class="material-symbols-rounded" aria-hidden="true">add</span>Yeni kayıt
              </button>
            }
          </app-empty-state>
        } @else {
          <!-- Desktop table -->
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full min-w-[880px] border-collapse">
              <thead class="bg-slate-50/80 dark:bg-slate-800/40">
                <tr>
                  <th class="odv-th">Kayıt</th>
                  @if (!kind) {
                    <th class="odv-th">Tür</th>
                  }
                  <th class="odv-th">Lokasyon</th>
                  <th class="odv-th">Risk</th>
                  <th class="odv-th">Sonraki kontrol</th>
                  <th class="odv-th">Durum</th>
                  <th class="odv-th"><span class="sr-only">İşlem</span></th>
                </tr>
              </thead>
              <tbody>
                @for (row of visible(); track row.id) {
                  <tr
                    class="cursor-pointer transition-colors hover:bg-indigo-50/40 dark:hover:bg-slate-800/60"
                    (click)="openEdit(row)"
                  >
                    <td class="odv-td">
                      <span class="flex items-center gap-3">
                        <span
                          class="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        >
                          <span class="material-symbols-rounded !text-lg" aria-hidden="true">{{
                            kindIcon(row.kind)
                          }}</span>
                        </span>
                        <span class="min-w-0">
                          <strong class="block truncate">{{ row.name }}</strong>
                          <span class="text-xs text-slate-500">{{
                            row.code || row.facilityCode || 'Kod yok'
                          }}</span>
                        </span>
                      </span>
                    </td>
                    @if (!kind) {
                      <td class="odv-td text-slate-600 dark:text-slate-300">
                        {{ kindLabel(row.kind) }}
                      </td>
                    }
                    <td class="odv-td text-slate-600 dark:text-slate-300">{{ row.location }}</td>
                    <td class="odv-td">
                      @if (row.riskLevel) {
                        <span [class]="riskClass(row)">{{ riskLabel(row) }}</span>
                      } @else {
                        <span class="text-xs text-slate-400">—</span>
                      }
                    </td>
                    <td class="odv-td">
                      @if (row.inspectionDueAt) {
                        <span
                          [class]="overdue(row) ? 'font-bold text-rose-600 dark:text-rose-400' : ''"
                        >
                          {{ row.inspectionDueAt | date: 'dd.MM.yyyy' }}
                        </span>
                        @if (overdue(row)) {
                          <span
                            class="mt-0.5 block text-[11px] font-bold text-rose-600 dark:text-rose-400"
                            >Süresi geçti</span
                          >
                        }
                      } @else {
                        <span class="text-xs text-slate-400">—</span>
                      }
                    </td>
                    <td class="odv-td">
                      <span [class]="statusClass(row)">{{ statusLabel(row.status) }}</span>
                    </td>
                    <td class="odv-td text-end">
                      <button
                        type="button"
                        class="odv-icon-btn"
                        [attr.aria-label]="row.name + ' kaydını aç'"
                        (click)="$event.stopPropagation(); openEdit(row)"
                      >
                        <span class="material-symbols-rounded">edit</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <!-- Mobile cards -->
          <ul class="m-0 list-none divide-y divide-slate-100 p-0 dark:divide-slate-800 md:hidden">
            @for (row of visible(); track row.id) {
              <li>
                <button
                  type="button"
                  class="block w-full bg-transparent p-4 text-start"
                  (click)="openEdit(row)"
                >
                  <span class="flex items-start justify-between gap-3">
                    <span class="min-w-0">
                      <strong class="block truncate text-sm">{{ row.name }}</strong>
                      <span class="block truncate text-xs text-slate-500"
                        >{{ kindLabel(row.kind) }} · {{ row.location }}</span
                      >
                    </span>
                    <span [class]="statusClass(row)">{{ statusLabel(row.status) }}</span>
                  </span>
                  <span class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    @if (row.riskLevel) {
                      <span [class]="riskClass(row)">{{ riskLabel(row) }}</span>
                    }
                    @if (row.inspectionDueAt) {
                      <span [class]="overdue(row) ? 'font-bold text-rose-600' : ''">
                        Kontrol: {{ row.inspectionDueAt | date: 'dd.MM.yyyy' }}
                      </span>
                    }
                  </span>
                </button>
              </li>
            }
          </ul>
          @if (nextCursor()) {
            <div class="border-t border-slate-100 p-4 text-center dark:border-slate-800">
              <button
                type="button"
                class="odv-btn-soft"
                (click)="loadMore()"
                [disabled]="loadingMore()"
              >
                {{ loadingMore() ? 'Yükleniyor…' : 'Daha fazla göster' }}
              </button>
            </div>
          }
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
      [icon]="kindIcon(draft().kind)"
      submitLabel="Kaydet"
      (closed)="drawerOpen.set(false)"
      (submitted)="save()"
    >
      @if (saveError()) {
        <div
          class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          role="alert"
        >
          {{ saveError() }}
        </div>
      }
      <section class="odv-card p-5">
        <h3 class="mb-4 mt-0 text-sm font-black">Temel bilgiler</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <label
            ><span class="mb-1 block text-xs font-bold">Kayıt türü *</span
            ><select
              class="odv-input"
              [value]="draft().kind"
              [disabled]="!!editing()"
              (change)="patch('kind', $any($event.target).value)"
            >
              <option value="equipment">Yangın ekipmanı</option>
              <option value="periodic-check">Periyodik kontrol</option>
              <option value="nonconformity">Uygunsuzluk</option>
              <option value="emergency-plan">Acil durum planı</option>
            </select>
            @if (editing()) {
              <span class="mt-1 block text-[11px] text-slate-500"
                >Kayıt türü oluşturulduktan sonra değiştirilemez.</span
              >
            }
          </label>
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
              required
              [value]="draft().name"
              (input)="patch('name', $any($event.target).value)"
          /></label>
          <label
            ><span class="mb-1 block text-xs font-bold">Lokasyon *</span
            ><input
              class="odv-input"
              required
              list="location-options"
              [value]="draft().location"
              (input)="patch('location', $any($event.target).value)"
            />
            <datalist id="location-options">
              @for (location of knownLocations(); track location) {
                <option [value]="location"></option>
              }
            </datalist>
          </label>
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
        <h3 class="mb-4 mt-0 text-sm font-black">Risk, tarih ve sorumluluk</h3>
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
          @if (draft().kind === 'periodic-check') {
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
          }
          <label
            ><span class="mb-1 block text-xs font-bold">Belge referansları</span
            ><input
              class="odv-input"
              placeholder="Rapor-24, Foto-18"
              [value]="draft().documentRefsText"
              (input)="patch('documentRefsText', $any($event.target).value)"
            /><span class="mt-1 block text-[11px] text-slate-500">Virgülle ayırın.</span></label
          >
          <label class="sm:col-span-2"
            ><span class="mb-1 block text-xs font-bold">{{
              draft().kind === 'nonconformity' ? 'Bulgu ve düzeltici faaliyet' : 'Notlar'
            }}</span
            ><textarea
              class="odv-input min-h-28"
              [value]="draft().notes"
              (input)="patch('notes', $any($event.target).value)"
            ></textarea>
          </label>
        </div>
      </section>
      @if (editing(); as row) {
        <div class="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            class="odv-btn-ghost !text-rose-600 dark:!text-rose-400"
            [disabled]="saving()"
            (click)="toggleArchive(row)"
          >
            <span class="material-symbols-rounded" aria-hidden="true">{{
              row.archivedAt ? 'unarchive' : 'archive'
            }}</span>
            {{ row.archivedAt ? 'Arşivden çıkar' : 'Arşivle' }}
          </button>
          <span class="text-xs text-slate-500">
            Sürüm {{ row.version }} · son güncelleme {{ row.updatedAt | date: 'dd.MM.yyyy HH:mm' }}
          </span>
        </div>
      }
    </app-slide-over>
  `,
})
export class FireSafePage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(FireSafeApi);
  private readonly section = String(this.route.snapshot.data['section'] ?? '');
  readonly reports = this.section === 'reports';
  readonly kind: FireSafeKind | null = this.section in KINDS ? KINDS[this.section] : 'equipment';
  readonly domain = PRODUCT_NAVIGATION.find((item) => item.key === this.section);
  readonly title = this.domain?.title ?? 'Yangın Güvenliği Kayıtları';
  readonly description = this.domain?.description ?? 'Denetlenebilir yangın güvenliği kayıtları.';
  readonly statusFilters = STATUS_FILTERS;

  readonly records = signal<FireSafeRecord[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly exporting = signal(false);
  readonly error = signal('');
  readonly search = signal('');
  readonly archived = signal(false);
  readonly statusFilter = signal<FireSafeStatus | null>(null);
  readonly overdueOnly = signal(false);
  readonly drawerOpen = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly editing = signal<FireSafeRecord | null>(null);
  readonly draft = signal<RecordDraft>(emptyDraft(this.kind ?? 'equipment'));
  readonly dirty = signal(false);

  readonly visible = computed(() =>
    this.overdueOnly() ? this.records().filter((row) => isOverdue(row)) : this.records(),
  );
  readonly overdueCount = computed(() => this.records().filter((row) => isOverdue(row)).length);
  readonly hasFilters = computed(
    () => !!this.search().trim() || this.statusFilter() !== null || this.overdueOnly(),
  );
  readonly knownLocations = computed(() =>
    [...new Set(this.records().map((row) => row.location))].sort((a, b) =>
      a.localeCompare(b, 'tr'),
    ),
  );

  private timer?: ReturnType<typeof setTimeout>;
  /** Ignores responses from superseded requests (e.g. fast typing in search). */
  private requestId = 0;

  constructor() {
    void this.load();
  }

  async load() {
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    try {
      const page = await this.api.list(this.kind, this.archived(), this.search(), {
        status: this.statusFilter(),
      });
      if (id !== this.requestId) return;
      this.records.set(page.items);
      this.nextCursor.set(page.nextCursor ?? null);
    } catch (e) {
      if (id === this.requestId)
        this.error.set(e instanceof Error ? e.message : 'Kayıtlar alınamadı.');
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }
  async loadMore() {
    const cursor = this.nextCursor();
    if (!cursor) return;
    const id = this.requestId;
    this.loadingMore.set(true);
    try {
      const page = await this.api.list(this.kind, this.archived(), this.search(), {
        status: this.statusFilter(),
        cursor,
      });
      if (id !== this.requestId) return;
      this.records.update((rows) => [...rows, ...page.items]);
      this.nextCursor.set(page.nextCursor ?? null);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Kayıtlar alınamadı.');
    } finally {
      this.loadingMore.set(false);
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
  setStatus(value: FireSafeStatus | null) {
    this.statusFilter.set(value);
    void this.load();
  }
  clearFilters() {
    this.search.set('');
    this.statusFilter.set(null);
    this.overdueOnly.set(false);
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
      inspectionDueAt: toLocalInput(row.inspectionDueAt),
      code: row.code ?? '',
      category: row.category ?? '',
      riskLevel: row.riskLevel ?? '',
      responsibleName: row.responsibleName ?? '',
      completedAt: toLocalInput(row.completedAt),
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
    if (draft.name.trim().length < 2 || draft.location.trim().length < 2) {
      this.saveError.set('Kayıt adı ve lokasyon en az 2 karakter olmalıdır.');
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
      customClass: {
        popup: 'odv-swal-popup',
        confirmButton: row.archivedAt ? 'odv-swal-confirm' : 'odv-swal-danger',
        cancelButton: 'odv-swal-cancel',
      },
    });
    if (!result.isConfirmed) return;
    this.saving.set(true);
    this.saveError.set('');
    try {
      if (row.archivedAt) await this.api.restore(row.id);
      else await this.api.archive(row.id);
      this.dirty.set(false);
      this.drawerOpen.set(false);
      await this.load();
    } catch (e) {
      this.saveError.set(e instanceof Error ? e.message : 'İşlem tamamlanamadı.');
    } finally {
      this.saving.set(false);
    }
  }
  async exportReport(format: 'json' | 'csv') {
    this.exporting.set(true);
    try {
      downloadReport(await this.api.report(), format);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Rapor oluşturulamadı.');
    } finally {
      this.exporting.set(false);
    }
  }
  overdue(row: FireSafeRecord) {
    return isOverdue(row);
  }
  kindIcon(kind: FireSafeKind) {
    return KIND_ICONS[kind];
  }
  kindLabel(kind: FireSafeKind) {
    return KIND_LABELS[kind];
  }
  riskLabel(row: FireSafeRecord) {
    return row.riskLevel ? RISK_LABELS[row.riskLevel] : 'Belirtilmedi';
  }
  riskClass(row: FireSafeRecord) {
    return row.riskLevel ? badgeClass(RISK_TONES[row.riskLevel]) : 'odv-badge-neutral';
  }
  statusLabel(status: FireSafeStatus) {
    return STATUS_LABELS[status];
  }
  statusClass(row: FireSafeRecord) {
    return badgeClass(STATUS_TONES[row.status]);
  }
}
