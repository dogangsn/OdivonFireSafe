const pad = (value: number) => String(value).padStart(2, '0');

/** ISO timestamp from the API → value for an `<input type="datetime-local">` in the user's time zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** `datetime-local` value (local wall clock) → absolute ISO timestamp for the API. */
export function fromLocalInput(local: string): string {
  if (!local) return '';
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
