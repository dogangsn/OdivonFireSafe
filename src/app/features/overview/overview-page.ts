import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { buildInsights, isOverdue } from '../../domain/fire-safe-insights';
import { KIND_ICONS, KIND_LABELS, KIND_PATHS } from '../../domain/fire-safe-labels';
import { EmptyState } from '../../shared/ui/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';
import { FireSafeApi, FireSafeAuditEntry, FireSafeRecord } from '../workspace/fire-safe.api';
import { downloadReport } from '../workspace/report-export';

const EVENT_LABELS: Record<string, string> = {
  created: 'Yeni kayıt oluşturuldu',
  updated: 'Kayıt güncellendi',
  archived: 'Kayıt arşivlendi',
  restored: 'Kayıt geri yüklendi',
};
const EVENT_ICONS: Record<string, string> = {
  created: 'add_circle',
  updated: 'edit_note',
  archived: 'archive',
  restored: 'restore',
};

@Component({
  selector: 'app-overview-page',
  imports: [PageHeader, KpiCard, EmptyState, RouterLink, DatePipe],
  template: `
    <div class="space-y-6">
      <app-page-header
        eyebrow="YANGIN GÜVENLİĞİ OPERASYON MERKEZİ"
        icon="local_fire_department"
        [title]="greeting()"
        description="Tesislerinizdeki ekipman, kontrol ve uygunsuzlukların güncel durumu."
      >
        <div actions class="flex flex-wrap gap-2">
          <button
            type="button"
            class="odv-btn-ghost"
            (click)="export('csv')"
            [disabled]="exporting()"
          >
            <span class="material-symbols-rounded" aria-hidden="true">table_view</span>Excel
          </button>
          <button
            type="button"
            class="odv-btn-soft"
            (click)="export('json')"
            [disabled]="exporting()"
          >
            <span class="material-symbols-rounded" aria-hidden="true">download</span>Denetim paketi
          </button>
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

      <!-- Compliance summary -->
      <section
        class="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        aria-labelledby="score-title"
      >
        <div class="grid gap-6 p-6 sm:p-7 lg:grid-cols-[auto_1fr] lg:items-center">
          <div class="relative mx-auto grid size-40 place-items-center">
            <svg viewBox="0 0 120 120" class="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke-width="12"
                class="stroke-slate-100 dark:stroke-slate-800"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke-width="12"
                stroke-linecap="round"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="gaugeOffset()"
                [class]="gaugeStroke()"
                style="transition: stroke-dashoffset .6s ease"
              />
            </svg>
            <div class="text-center">
              @if (loading()) {
                <span class="odv-skeleton block h-10 w-20"></span>
              } @else {
                <strong class="block text-4xl font-black leading-none tracking-tight">{{
                  insights().complianceScore === null ? '—' : '%' + insights().complianceScore
                }}</strong>
              }
              <span class="mt-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >Uyum skoru</span
              >
            </div>
          </div>
          <div>
            <h2 id="score-title" class="m-0 text-xl font-black tracking-tight sm:text-2xl">
              {{ headline() }}
            </h2>
            <p class="mb-0 mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Skor; süresi geçmiş kontrolleri, "aksiyon gerekli" durumundaki kayıtları ve açık
              yüksek/kritik uygunsuzlukları hesaba katar. Takvimindeki bekleyen kayıtlar skoru
              düşürmez.
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span [class]="insights().overdue ? 'odv-badge-danger' : 'odv-badge-success'">
                <span class="material-symbols-rounded !text-sm" aria-hidden="true">event_busy</span>
                {{ insights().overdue }} süresi geçmiş
              </span>
              <span [class]="insights().actionRequired ? 'odv-badge-warning' : 'odv-badge-neutral'">
                <span class="material-symbols-rounded !text-sm" aria-hidden="true"
                  >priority_high</span
                >
                {{ insights().actionRequired }} aksiyon gerekli
              </span>
              <span class="odv-badge-info">
                <span class="material-symbols-rounded !text-sm" aria-hidden="true"
                  >inventory_2</span
                >
                {{ insights().total }} aktif kayıt
              </span>
            </div>
            @if (truncated()) {
              <p class="mb-0 mt-3 text-xs text-amber-700 dark:text-amber-300">
                Genel bakış en son güncellenen {{ records().length }} kayıt üzerinden hesaplandı.
              </p>
            }
          </div>
        </div>
      </section>

      <!-- KPI cards -->
      <section
        class="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4"
        aria-label="Temel göstergeler"
      >
        <app-kpi-card
          label="Süresi geçen kontrol"
          icon="event_busy"
          [kind]="insights().overdue ? 'danger' : 'positive'"
          [value]="insights().overdue"
          [note]="insights().overdue ? 'Hemen planlanmalı' : 'Geciken kontrol yok'"
          footer="Kontrol tarihi geçmiş açık kayıtlar"
          link="/periodic-checks"
          [loading]="loading()"
        />
        <app-kpi-card
          label="30 gün içinde"
          icon="event_upcoming"
          kind="warning"
          [value]="insights().dueSoon"
          note="Yaklaşan kontrol ve bakım"
          footer="Takvimdeki açık kayıtlar"
          link="/periodic-checks"
          [loading]="loading()"
        />
        <app-kpi-card
          label="Açık uygunsuzluk"
          icon="report"
          [kind]="insights().criticalNonconformities ? 'danger' : 'info'"
          [value]="insights().openNonconformities"
          [note]="insights().criticalNonconformities + ' kritik seviyede'"
          footer="Kapanış bekleyen bulgular"
          link="/nonconformities"
          [loading]="loading()"
        />
        <app-kpi-card
          label="Yangın ekipmanı"
          icon="fire_extinguisher"
          kind="primary"
          [value]="dashboard()?.equipment ?? 0"
          [note]="(dashboard()?.emergencyPlans ?? 0) + ' acil durum planı'"
          footer="Takip edilen ekipman"
          link="/equipment"
          [loading]="loading()"
        />
      </section>

      <div class="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <!-- Agenda -->
        <section class="odv-card overflow-hidden" aria-labelledby="agenda-title">
          <header
            class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"
          >
            <div>
              <h2 id="agenda-title" class="m-0 text-lg font-black tracking-tight">Yapılacaklar</h2>
              <p class="mb-0 mt-0.5 text-xs text-slate-500">
                Geciken ve önümüzdeki 14 gün içindeki kontroller
              </p>
            </div>
            <a routerLink="/periodic-checks" class="odv-btn-ghost !min-h-9 text-xs">Tümü</a>
          </header>
          @if (loading()) {
            <div class="space-y-3 p-5">
              @for (i of skeleton; track i) {
                <span class="odv-skeleton block h-12"></span>
              }
            </div>
          } @else {
            <ul class="m-0 list-none divide-y divide-slate-100 p-0 dark:divide-slate-800">
              @for (row of insights().agenda; track row.id) {
                <li>
                  <a
                    [routerLink]="kindPath(row)"
                    class="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span
                      class="grid size-10 shrink-0 place-items-center rounded-xl"
                      [class]="
                        overdue(row)
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
                      "
                    >
                      <span class="material-symbols-rounded" aria-hidden="true">{{
                        kindIcon(row)
                      }}</span>
                    </span>
                    <span class="min-w-0 flex-1">
                      <strong class="block truncate text-sm">{{ row.name }}</strong>
                      <span class="block truncate text-xs text-slate-500"
                        >{{ kindLabel(row) }} · {{ row.location }}</span
                      >
                    </span>
                    <span class="text-end">
                      <span [class]="overdue(row) ? 'odv-badge-danger' : 'odv-badge-warning'">{{
                        relative(row.inspectionDueAt!)
                      }}</span>
                      <span class="mt-1 block text-[11px] text-slate-500">{{
                        row.inspectionDueAt | date: 'dd.MM.yyyy'
                      }}</span>
                    </span>
                  </a>
                </li>
              } @empty {
                <li>
                  <app-empty-state
                    icon="task_alt"
                    title="Yakın tarihli iş yok"
                    body="Önümüzdeki 14 gün içinde planlanmış veya geciken kontrol bulunmuyor."
                  />
                </li>
              }
            </ul>
          }
        </section>

        <!-- Location risk -->
        <section class="odv-card overflow-hidden" aria-labelledby="locations-title">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 id="locations-title" class="m-0 text-lg font-black tracking-tight">
              Lokasyon riskleri
            </h2>
            <p class="mb-0 mt-0.5 text-xs text-slate-500">Sorunlu kayıt oranına göre sıralı</p>
          </header>
          @if (loading()) {
            <div class="space-y-4 p-5">
              @for (i of skeleton; track i) {
                <span class="odv-skeleton block h-9"></span>
              }
            </div>
          } @else {
            <ul class="m-0 list-none space-y-4 p-5">
              @for (place of insights().locations; track place.location) {
                <li>
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <strong class="truncate">{{ place.location }}</strong>
                    <span class="shrink-0 text-xs text-slate-500">{{ place.total }} kayıt</span>
                  </div>
                  <div
                    class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                    role="meter"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    [attr.aria-valuenow]="place.score"
                    [attr.aria-label]="place.location + ' risk oranı'"
                  >
                    <div
                      class="h-full rounded-full"
                      [class]="
                        place.score >= 50
                          ? 'bg-rose-500'
                          : place.score >= 20
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      "
                      [style.width.%]="place.score || 2"
                    ></div>
                  </div>
                  <div class="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                    <span>{{ place.overdue }} geciken</span>
                    <span>{{ place.openNonconformities }} açık uygunsuzluk</span>
                    <span>{{ place.highRisk }} yüksek risk</span>
                  </div>
                </li>
              } @empty {
                <li>
                  <app-empty-state
                    icon="location_on"
                    title="Henüz lokasyon yok"
                    body="Kayıt ekledikçe lokasyon bazlı risk dağılımı burada görünür."
                  />
                </li>
              }
            </ul>
          }
        </section>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <!-- Completed checks per month -->
        <section class="odv-card p-5" aria-labelledby="trend-title">
          <div class="flex items-end justify-between gap-3">
            <div>
              <h2 id="trend-title" class="m-0 text-lg font-black tracking-tight">
                Tamamlanan kontroller
              </h2>
              <p class="mb-0 mt-0.5 text-xs text-slate-500">Son 12 ay, aylık</p>
            </div>
            <strong class="text-2xl font-black">{{ yearTotal() }}</strong>
          </div>
          <div
            class="mt-6 flex h-40 items-end gap-1.5 sm:gap-2.5"
            role="list"
            aria-label="Aylık tamamlanan kontrol sayısı"
          >
            @for (bucket of insights().completions; track bucket.key) {
              <div
                class="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                role="listitem"
                [attr.aria-label]="bucket.label + ': ' + bucket.count"
              >
                <span class="text-[10px] font-bold text-slate-500">{{ bucket.count || '' }}</span>
                <div
                  class="w-full max-w-8 rounded-t-md transition-all"
                  [class]="
                    bucket.count
                      ? 'bg-indigo-500/85 dark:bg-indigo-400/80'
                      : 'bg-slate-200 dark:bg-slate-800'
                  "
                  [style.height.%]="barHeight(bucket.count)"
                ></div>
                <span class="text-[10px] font-semibold text-slate-500">{{ bucket.label }}</span>
              </div>
            }
          </div>
        </section>

        <!-- Recent activity -->
        <section class="odv-card overflow-hidden" aria-labelledby="activity-title">
          <header
            class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"
          >
            <h2 id="activity-title" class="m-0 text-lg font-black tracking-tight">
              Son aktiviteler
            </h2>
            <a routerLink="/activity" class="odv-btn-ghost !min-h-9 text-xs">Günlük</a>
          </header>
          <ul class="m-0 list-none divide-y divide-slate-100 p-0 dark:divide-slate-800">
            @for (entry of activity(); track entry.id) {
              <li class="flex items-center gap-3 px-5 py-3">
                <span
                  class="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  <span class="material-symbols-rounded !text-lg" aria-hidden="true">{{
                    eventIcon(entry.event)
                  }}</span>
                </span>
                <span class="min-w-0 flex-1">
                  <strong class="block truncate text-sm">{{ recordName(entry) }}</strong>
                  <span class="block text-xs text-slate-500"
                    >{{ eventLabel(entry.event) }} · sürüm {{ entry.version }}</span
                  >
                </span>
                <time
                  class="shrink-0 text-[11px] text-slate-500"
                  [attr.datetime]="entry.createdAt"
                  >{{ entry.createdAt | date: 'dd.MM HH:mm' }}</time
                >
              </li>
            } @empty {
              <li><app-empty-state icon="history" title="Henüz aktivite yok" /></li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class OverviewPage {
  private readonly api = inject(FireSafeApi);
  private readonly auth = inject(AuthStore);
  readonly circumference = 2 * Math.PI * 52;
  readonly skeleton = [1, 2, 3, 4];
  readonly records = signal<FireSafeRecord[]>([]);
  readonly truncated = signal(false);
  readonly dashboard = signal<{ equipment: number; emergencyPlans: number } | null>(null);
  readonly activity = signal<FireSafeAuditEntry[]>([]);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly error = signal('');
  readonly insights = computed(() => buildInsights(this.records()));
  readonly greeting = computed(() => {
    const name = this.auth.session()?.name?.split(' ')[0];
    const hour = new Date().getHours();
    const prefix = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
    return name ? `${prefix}, ${name}` : 'Genel Bakış';
  });
  readonly headline = computed(() => {
    const i = this.insights();
    if (this.loading()) return 'Uyum durumu hesaplanıyor…';
    if (i.complianceScore === null) return 'İlk kayıtlarınızı ekleyerek başlayın';
    if (i.overdue) return `${i.overdue} kontrolün süresi geçti, öncelik bunlarda`;
    if (i.actionRequired) return `${i.actionRequired} kayıt aksiyon bekliyor`;
    return 'Tesisleriniz denetime hazır görünüyor';
  });
  readonly gaugeOffset = computed(
    () => this.circumference * (1 - (this.insights().complianceScore ?? 0) / 100),
  );
  readonly gaugeStroke = computed(() => {
    const score = this.insights().complianceScore ?? 0;
    return score >= 85
      ? 'stroke-emerald-500'
      : score >= 60
        ? 'stroke-amber-500'
        : 'stroke-rose-500';
  });
  readonly yearTotal = computed(() =>
    this.insights().completions.reduce((sum, bucket) => sum + bucket.count, 0),
  );
  private readonly maxBucket = computed(() =>
    Math.max(1, ...this.insights().completions.map((bucket) => bucket.count)),
  );
  private readonly names = computed(
    () => new Map(this.records().map((record) => [record.id, record.name])),
  );

  constructor() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [all, dashboard] = await Promise.all([this.api.listAll(), this.api.dashboard()]);
      this.records.set(all.items);
      this.truncated.set(all.truncated);
      this.dashboard.set(dashboard);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Genel bakış verileri alınamadı.');
    } finally {
      this.loading.set(false);
    }
    // Activity is secondary: a failure here should not block the page.
    try {
      this.activity.set((await this.api.audit(6)).slice(0, 6));
    } catch {
      this.activity.set([]);
    }
  }

  async export(format: 'json' | 'csv') {
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
  kindIcon(row: FireSafeRecord) {
    return KIND_ICONS[row.kind];
  }
  kindLabel(row: FireSafeRecord) {
    return KIND_LABELS[row.kind];
  }
  kindPath(row: FireSafeRecord) {
    return KIND_PATHS[row.kind];
  }
  relative(iso: string) {
    const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
    if (days === 0) return 'Bugün';
    return days < 0 ? `${-days} gün gecikti` : `${days} gün kaldı`;
  }
  barHeight(count: number) {
    return count ? Math.max(6, (count / this.maxBucket()) * 100) : 4;
  }
  eventKey(event: string) {
    return event.split('.').pop() ?? event;
  }
  eventLabel(event: string) {
    return EVENT_LABELS[this.eventKey(event)] ?? event;
  }
  eventIcon(event: string) {
    return EVENT_ICONS[this.eventKey(event)] ?? 'history';
  }
  recordName(entry: FireSafeAuditEntry) {
    return this.names().get(entry.entityId) ?? 'Yangın güvenliği kaydı';
  }
}
