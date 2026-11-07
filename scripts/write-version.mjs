import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

// Every commit gets its own version: major.minor come from package.json, the patch number is the
// commit count, so each new commit raises it (1.0.12 -> 1.0.13). APP_VERSION overrides it.
const git = (...args) => {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

// CI hosts may clone only the last commit; fetch the history so the commit count is right.
if (git('rev-parse', '--is-shallow-repository') === 'true') git('fetch', '--unshallow', '--quiet');

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const [major = '1', minor = '0'] = String(pkg.version).split('.');
const fullCommit =
  git('rev-parse', 'HEAD') || process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || '';
const commit = fullCommit ? fullCommit.slice(0, 7) : 'development';
const commitCount = git('rev-list', '--count', 'HEAD') || '0';
const version = process.env.APP_VERSION || `${major}.${minor}.${commitCount}`;
const builtAt = new Date().toISOString();
// Same commit -> same buildId, so rebuilding a commit does not sign users out again.
const buildId = `${version}-${commit}`;
const info = { version, buildId, commit, builtAt };

mkdirSync('src/app/core/version', { recursive: true });
writeFileSync(
  'src/app/core/version/build-info.ts',
  `export const BUILD_INFO = ${JSON.stringify(info)} as const;\n`,
);
writeFileSync(
  'public/version.json',
  JSON.stringify({ ...info, releasedAt: builtAt, releaseNotes: [] }, null, 2),
);
console.log(`OdivonFireSafe ${version} (${commit})`);
