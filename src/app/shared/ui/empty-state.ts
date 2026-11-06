import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="flex flex-col items-center px-6 py-12 text-center">
      <span
        class="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
      >
        <span class="material-symbols-rounded !text-3xl" aria-hidden="true">{{ icon() }}</span>
      </span>
      <strong class="mt-4 block text-sm font-black text-slate-900 dark:text-white">{{
        title()
      }}</strong>
      @if (body()) {
        <p class="mb-0 mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
          {{ body() }}
        </p>
      }
      <div class="mt-4 empty:hidden"><ng-content /></div>
    </div>
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly body = input('');
}
