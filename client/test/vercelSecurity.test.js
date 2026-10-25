import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const configPaths = [
  new URL('../../vercel.json', import.meta.url),
  new URL('../vercel.json', import.meta.url)
];

test('Vercel configurations proxy the API and define restrictive browser headers', async () => {
  for (const configPath of configPaths) {
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const apiRewrite = config.rewrites.find((rewrite) => rewrite.source === '/api/(.*)');
    const csp = config.headers
      .find((entry) => entry.source === '/(.*)')
      .headers.find((header) => header.key === 'Content-Security-Policy').value;

    assert.match(apiRewrite.destination, /^https:\/\/[^/]+\/\$1$/);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
  }
});
