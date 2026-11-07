import { DatePipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth/auth-store';
import { I18nStore, SupportedLang, TranslatePipe } from '../core/i18n/i18n';
import { PRODUCT_NAVIGATION } from '../domain/domain-navigation';
import { PRODUCT } from '../domain/product-manifest';
import { BUILD_INFO } from '../core/version/build-info';

interface MenuItem {
  readonly path: string;
  readonly icon: string;
  readonly labelKey: string;
}
interface MenuGroup {
  readonly title: string;
  readonly items: readonly MenuItem[];
}

const nav = (key: string): MenuItem => {
  const item = PRODUCT_NAVIGATION.find((entry) => entry.key === key)!;
  return { path: `/${item.path}`, icon: item.icon, labelKey: `nav.${item.key}` };
};

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe, DatePipe],
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    <div class="min-h-screen text-slate-900 dark:text-slate-100">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[80] odv-btn-primary"
        >İçeriğe geç</a
      >
      @if (mobileOpen()) {
        <button
          type="button"
          class="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          aria-label="Menüyü kapat"
          (click)="mobileOpen.set(false)"
        ></button>
      }
      <aside
        class="fixed inset-y-0 start-0 z-40 flex w-72 flex-col border-e border-slate-200/80 bg-white/95 backdrop-blur transition-transform dark:border-slate-800 dark:bg-slate-900/95 lg:translate-x-0"
        [class.-translate-x-full]="!mobileOpen() && i18n.active().dir === 'ltr'"
        [class.translate-x-full]="!mobileOpen() && i18n.active().dir === 'rtl'"
        aria-label="Kenar menüsü"
      >
        <div class="flex items-center justify-between px-5 pb-4 pt-5">
          <a routerLink="/overview" class="flex items-center gap-3" (click)="mobileOpen.set(false)">
            <span
              class="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/25"
            >
              <span class="material-symbols-rounded" aria-hidden="true">local_fire_department</span>
            </span>
            <span>
              <strong class="block text-base leading-tight tracking-tight">Odivon</strong>
              <span class="text-xs font-semibold text-slate-500">FireSafe</span>
            </span>
          </a>
          <button
            type="button"
            class="odv-icon-btn lg:hidden"
            (click)="mobileOpen.set(false)"
            aria-label="Menüyü kapat"
          >
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>

        <div class="px-4">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-start text-sm text-slate-500 transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
            (click)="openPalette()"
          >
            <span class="material-symbols-rounded !text-lg" aria-hidden="true">search</span>
            <span class="flex-1">Hızlı git…</span>
            <kbd
              class="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-900"
              >{{ shortcut }}</kbd
            >
          </button>
        </div>

        <nav aria-label="Ana menü" class="custom-scroll mt-4 flex-1 overflow-y-auto px-4 pb-4">
          @for (group of groups(); track group.title) {
            <div class="mb-5">
              <div
                class="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400"
              >
                {{ group.title }}
              </div>
              <ul class="m-0 list-none space-y-0.5 p-0">
                @for (item of group.items; track item.path) {
                  <li>
                    <a
                      [routerLink]="item.path"
                      routerLinkActive="!bg-indigo-50 !text-indigo-700 dark:!bg-indigo-500/10 dark:!text-indigo-300 [&>.material-symbols-rounded]:!text-indigo-600 dark:[&>.material-symbols-rounded]:!text-indigo-300"
                      #rla="routerLinkActive"
                      [attr.aria-current]="rla.isActive ? 'page' : null"
                      class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800"
                      (click)="mobileOpen.set(false)"
                      ><span class="material-symbols-rounded text-slate-400" aria-hidden="true">{{
                        item.icon
                      }}</span
                      >{{ item.labelKey | t }}</a
                    >
                  </li>
                }
              </ul>
            </div>
          }
        </nav>

        <div class="border-t border-slate-200/80 p-4 dark:border-slate-800">
          @if (trialEnds(); as ends) {
            <a
              routerLink="/billing"
              class="mb-3 block rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <strong class="block">Deneme süreniz devam ediyor</strong>
              {{ ends | date: 'dd.MM.yyyy' }} tarihine kadar · Planları gör
            </a>
          }
          <div class="flex items-center gap-3">
            <span
              class="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
              aria-hidden="true"
              >{{ initials() }}</span
            >
            <div class="min-w-0 flex-1">
              <strong class="block truncate text-xs">{{ auth.session()?.name }}</strong>
              <span class="block truncate text-[11px] text-slate-500">{{
                auth.session()?.tenantName || auth.session()?.email
              }}</span>
            </div>
            <button
              type="button"
              class="odv-icon-btn shrink-0"
              (click)="logout()"
              aria-label="Güvenli çıkış"
            >
              <span class="material-symbols-rounded directional-icon">logout</span>
            </button>
          </div>
          <p class="mt-3 text-center text-[11px] text-slate-500" [title]="build.builtAt">
            Sürüm {{ build.version }} · {{ build.commit }}
          </p>
        </div>
      </aside>

      <div class="lg:ms-72">
        <header
          class="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-[#0b1120]/80 sm:px-6 lg:px-8"
        >
          <div class="flex min-w-0 items-center gap-3">
            <button
              class="odv-icon-btn lg:hidden"
              type="button"
              (click)="mobileOpen.set(true)"
              aria-label="Menüyü aç"
            >
              <span class="material-symbols-rounded">menu</span>
            </button>
            <div class="min-w-0">
              <strong class="block truncate text-sm">{{
                auth.session()?.tenantName || product.name
              }}</strong>
              <span class="hidden text-[11px] text-slate-500 sm:block"
                >Yangın güvenliği operasyon merkezi</span
              >
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="odv-icon-btn lg:hidden"
              (click)="openPalette()"
              aria-label="Hızlı git"
            >
              <span class="material-symbols-rounded">search</span>
            </button>
            <label class="sr-only" for="language">Dil</label
            ><select
              id="language"
              class="odv-input !w-auto !py-2 !text-xs"
              [value]="i18n.currentLang()"
              (change)="setLanguage($any($event.target).value)"
            >
              @for (language of i18n.options; track language.code) {
                <option [value]="language.code">
                  {{ language.flag }} {{ language.nativeName }}
                </option>
              }</select
            ><button
              type="button"
              class="odv-icon-btn"
              (click)="toggleTheme()"
              [attr.aria-label]="dark() ? 'Açık temaya geç' : 'Koyu temaya geç'"
            >
              <span class="material-symbols-rounded">{{
                dark() ? 'light_mode' : 'dark_mode'
              }}</span>
            </button>
          </div>
        </header>
        <main id="main" class="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8"><router-outlet /></main>
      </div>

      @if (paletteOpen()) {
        <div
          class="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm"
          (click)="paletteOpen.set(false)"
        ></div>
        <div
          class="fixed inset-x-4 top-[12vh] z-[61] mx-auto max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          role="dialog"
          aria-modal="true"
          aria-label="Hızlı git"
        >
          <div class="flex items-center gap-2 border-b border-slate-100 px-4 dark:border-slate-800">
            <span class="material-symbols-rounded text-slate-400" aria-hidden="true">search</span>
            <input
              #paletteInput
              type="search"
              class="h-14 flex-1 bg-transparent text-sm outline-none"
              placeholder="Sayfa ara…"
              aria-label="Sayfa ara"
              role="combobox"
              aria-controls="palette-results"
              [attr.aria-activedescendant]="'palette-' + paletteIndex()"
              aria-expanded="true"
              [value]="paletteQuery()"
              (input)="paletteQuery.set($any($event.target).value); paletteIndex.set(0)"
              (keydown.arrowdown)="movePalette(1, $event)"
              (keydown.arrowup)="movePalette(-1, $event)"
              (keydown.enter)="choosePalette()"
            />
            <kbd
              class="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:border-slate-700"
              >Esc</kbd
            >
          </div>
          <ul
            id="palette-results"
            role="listbox"
            class="m-0 max-h-80 list-none overflow-y-auto p-2"
          >
            @for (item of paletteResults(); track item.path; let i = $index) {
              <li
                [id]="'palette-' + i"
                role="option"
                [attr.aria-selected]="i === paletteIndex()"
                class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
                [class.bg-indigo-50]="i === paletteIndex()"
                [class.text-indigo-700]="i === paletteIndex()"
                (mouseenter)="paletteIndex.set(i)"
                (click)="go(item.path)"
              >
                <span class="material-symbols-rounded text-slate-400" aria-hidden="true">{{
                  item.icon
                }}</span>
                {{ item.labelKey | t }}
              </li>
            } @empty {
              <li class="px-3 py-6 text-center text-sm text-slate-500">Sonuç bulunamadı</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class AppShell {
  readonly product = PRODUCT;
  readonly build = BUILD_INFO;
  readonly auth = inject(AuthStore);
  readonly i18n = inject(I18nStore);
  private readonly router = inject(Router);
  readonly mobileOpen = signal(false);
  readonly paletteOpen = signal(false);
  readonly paletteQuery = signal('');
  readonly paletteIndex = signal(0);
  readonly shortcut = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '')
    ? '⌘K'
    : 'Ctrl K';
  readonly dark = signal(this.storedTheme() === 'dark');
  private readonly paletteInput = viewChild<ElementRef<HTMLInputElement>>('paletteInput');

  readonly groups = computed<MenuGroup[]>(() => {
    const role = this.auth.session()?.role;
    const admin = role === 'owner' || role === 'admin';
    return [
      {
        title: 'Genel',
        items: [{ path: '/overview', icon: 'space_dashboard', labelKey: 'nav.overview' }],
      },
      {
        title: 'Operasyon',
        items: [nav('equipment'), nav('periodic-checks'), nav('emergency-plans')],
      },
      {
        title: 'Uyum',
        items: [
          nav('nonconformities'),
          nav('reports'),
          { path: '/activity', icon: 'history', labelKey: 'nav.activity' },
        ],
      },
      {
        title: 'Yönetim',
        items: [
          ...(admin ? [{ path: '/billing', icon: 'credit_card', labelKey: 'nav.billing' }] : []),
          { path: '/settings', icon: 'settings', labelKey: 'nav.settings' },
        ],
      },
    ];
  });
  private readonly allItems = computed(() => this.groups().flatMap((group) => group.items));
  readonly paletteResults = computed(() => {
    const query = this.paletteQuery().trim().toLocaleLowerCase('tr-TR');
    return this.allItems().filter(
      (item) => !query || this.i18n.t(item.labelKey).toLocaleLowerCase('tr-TR').includes(query),
    );
  });
  readonly initials = computed(() => {
    const source = this.auth.session()?.name || this.auth.session()?.email || '?';
    const parts = source
      .replace(/@.*/, '')
      .split(/[\s._-]+/)
      .filter(Boolean);
    return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toLocaleUpperCase('tr-TR');
  });
  readonly trialEnds = computed(() => {
    const session = this.auth.session();
    return session?.membershipStatus === 'trial' ? session.trialEndsAt : null;
  });

  constructor() {
    document.documentElement.classList.toggle('dark', this.dark());
    this.i18n.setLanguage(this.i18n.currentLang());
  }
  onKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.paletteOpen()) this.paletteOpen.set(false);
      else this.openPalette();
    } else if (event.key === 'Escape' && this.paletteOpen()) {
      this.paletteOpen.set(false);
    }
  }
  openPalette() {
    this.paletteQuery.set('');
    this.paletteIndex.set(0);
    this.paletteOpen.set(true);
    this.mobileOpen.set(false);
    setTimeout(() => this.paletteInput()?.nativeElement.focus());
  }
  movePalette(step: number, event: Event) {
    event.preventDefault();
    const count = this.paletteResults().length;
    if (count) this.paletteIndex.update((i) => (i + step + count) % count);
  }
  choosePalette() {
    const item = this.paletteResults()[this.paletteIndex()];
    if (item) this.go(item.path);
  }
  go(path: string) {
    this.paletteOpen.set(false);
    void this.router.navigateByUrl(path);
  }
  setLanguage(value: string): void {
    this.i18n.setLanguage(value as SupportedLang);
  }
  toggleTheme(): void {
    this.dark.update((v) => !v);
    document.documentElement.classList.toggle('dark', this.dark());
    try {
      localStorage.setItem('odivon:theme', this.dark() ? 'dark' : 'light');
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
  }
  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
  private storedTheme(): string | null {
    try {
      return (
        localStorage.getItem('odivon:theme') ??
        (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : null)
      );
    } catch {
      return null;
    }
  }
}
