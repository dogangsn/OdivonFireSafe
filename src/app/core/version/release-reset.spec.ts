import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILD_INFO } from './build-info';
import { RELEASE_KEY, resetOnNewRelease } from './release-reset';

describe('resetOnNewRelease', () => {
  const replace = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    replace.mockReset();
    vi.stubGlobal('location', {
      ...window.location,
      pathname: '/overview',
      hostname: 'localhost',
      replace,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lets a first visit through and remembers the build', async () => {
    expect(await resetOnNewRelease()).toBe(true);
    expect(localStorage.getItem(RELEASE_KEY)).toBe(BUILD_INFO.buildId);
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps everything when the build has not changed', async () => {
    localStorage.setItem(RELEASE_KEY, BUILD_INFO.buildId);
    localStorage.setItem('odivon:fire-safe:session', '{}');
    expect(await resetOnNewRelease()).toBe(true);
    expect(localStorage.getItem('odivon:fire-safe:session')).toBe('{}');
  });

  it('clears the old session, keeps preferences and opens login after a new release', async () => {
    localStorage.setItem(RELEASE_KEY, '1.0.1-old');
    localStorage.setItem('odivon:fire-safe:session', '{}');
    localStorage.setItem('odivon:theme', 'dark');
    sessionStorage.setItem('draft', 'x');
    expect(await resetOnNewRelease()).toBe(false);
    expect(localStorage.getItem('odivon:fire-safe:session')).toBeNull();
    expect(localStorage.getItem('odivon:theme')).toBe('dark');
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.getItem(RELEASE_KEY)).toBe(BUILD_INFO.buildId);
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('does not redirect when already on a public page', async () => {
    vi.stubGlobal('location', {
      ...window.location,
      pathname: '/login',
      hostname: 'localhost',
      replace,
    });
    localStorage.setItem(RELEASE_KEY, '1.0.1-old');
    expect(await resetOnNewRelease()).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });
});
