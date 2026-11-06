import { fromLocalInput, toLocalInput } from './local-datetime';

describe('local datetime', () => {
  it('round-trips through the browser time zone', () => {
    const iso = fromLocalInput('2026-11-06T14:30');
    expect(iso).toBe(new Date('2026-11-06T14:30').toISOString());
    expect(toLocalInput(iso)).toBe('2026-11-06T14:30');
  });
  it('returns empty strings for missing or invalid values', () => {
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput('nope')).toBe('');
    expect(fromLocalInput('')).toBe('');
  });
});
