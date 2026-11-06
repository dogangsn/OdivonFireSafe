import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type KpiTone = 'primary' | 'positive' | 'warning' | 'danger' | 'info';

const TONES: Record<KpiTone, { icon: string; note: string }> = {
  primary: {
    icon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300',
    note: 'text-indigo-600 dark:text-indigo-300',
  },
  positive: {
    icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
    note: 'text-emerald-600 dark:text-emerald-300',
  },
  warning: {
    icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
    note: 'text-amber-700 dark:text-amber-300',
  },
  danger: {
    icon: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300',
    note: 'text-rose-600 dark:text-rose-300',
  },
  info: {
    icon: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300',
    note: 'text-sky-700 dark:text-sky-300',
  },
};

@Component({
  selector: 'app-kpi-card',
  imports: [RouterLink],
  template: `
    <article
      class="group relative flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
      <div class="flex items-center justify-between gap-3">
        <span
          class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-xs"
          >{{ label() }}</span
        >
        <span
          class="grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 {{ tone().icon }}"
        >
          <span class="material-symbols-rounded" aria-hidden="true">{{ icon() }}</span>
        </span>
      </div>
      @if (loading()) {
        <span class="odv-skeleton mt-4 block h-11 w-24"></span>
        <span class="odv-skeleton mt-2 block h-3 w-32"></span>
      } @else {
        <strong
          class="mt-4 block text-3xl font-black leading-none tracking-tight text-slate-900 dark:text-white sm:text-5xl"
          >{{ value() }}</strong
        >
        <span class="mt-2 block text-xs font-semibold {{ tone().note }}">{{ note() }}</span>
      }
      @if (footer() || link()) {
        <div
          class="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400"
        >
          <span class="hidden sm:inline">{{ footer() }}</span>
          @if (link()) {
            <a
              [routerLink]="link()"
              class="inline-flex items-center gap-1 font-bold text-indigo-600 after:absolute after:inset-0 after:rounded-2xl hover:underline dark:text-indigo-300"
              >İncele<span
                class="material-symbols-rounded directional-icon !text-base"
                aria-hidden="true"
                >arrow_forward</span
              ></a
            >
          }
        </div>
      }
    </article>
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly note = input('');
  readonly icon = input('monitoring');
  readonly kind = input<KpiTone>('primary');
  readonly footer = input('');
  readonly link = input<string | null>(null);
  readonly loading = input(false);
  protected readonly tone = computed(() => TONES[this.kind()]);
}
