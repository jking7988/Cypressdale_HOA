import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('retired CMS packages and commands are not direct application dependencies', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  for (const dependency of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.ok(!dependency.startsWith('@sanity/') && !['sanity', 'next-sanity', 'groq'].includes(dependency), dependency);
  }
  assert.equal(pkg.scripts['migration:backup'], undefined);
  const lock = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8'));
  for (const name of ['sanity', 'next-sanity', '@sanity/vision', '@sanity/visual-editing', '@sanity/image-url']) {
    assert.equal(lock.packages[`node_modules/${name}`], undefined, name);
  }
  assert.ok(pkg.dependencies['@portabletext/editor']);
  assert.ok(pkg.dependencies['@portabletext/react']);
});

test('Studio, old CMS clients and legacy mutation/preview endpoints are retired', async () => {
  for (const file of ['sanity', 'lib/sanity.client.ts', 'lib/sanity.server.ts', 'lib/sanity.image.ts', 'lib/live.ts', 'lib/queries.ts',
    'components/SanityVisualEditing.tsx', 'components/DeletePostButton.tsx', 'app/api/news/delete/route.ts',
    'app/api/draft-mode/enable/route.ts', 'app/api/draft-mode/disable/route.ts', 'scripts/migration/backup-sanity.mjs']) {
    await assert.rejects(access(new URL(file, root)), { code: 'ENOENT' });
  }
});

test('runtime source has no CMS imports, credentials, CDN or Studio URLs', async () => {
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) await scan(file);
      else if (/\.(tsx?|mjs)$/.test(entry.name)) {
        const source = await readFile(file, 'utf8');
        assert.doesNotMatch(source, /next-sanity|@sanity\/|SANITY_(?:API|WRITE|PREVIEW|PROJECT|DATASET)|(?:cdn|api)\.sanity\.io|sanity\.studio/, file.pathname);
      }
    }
  }
  for (const directory of ['app/', 'components/', 'lib/']) await scan(new URL(directory, root));
  for (const file of ['next.config.mjs', 'scripts/member-hub/dev.mjs']) {
    assert.doesNotMatch(await readFile(new URL(file, root), 'utf8'), /sanity/i, file);
  }
});
