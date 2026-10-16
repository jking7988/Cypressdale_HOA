import test from 'node:test';
import assert from 'node:assert/strict';

test('isolated development has a separate build cache; hosted and production keep the standard cache', async () => {
  const original = process.env.MEMBER_HUB_ENVIRONMENT;
  try {
    for (const mode of ['local', 'hosted-development', 'production']) {
      process.env.MEMBER_HUB_ENVIRONMENT = mode;
      const { default: configuration } = await import(`../../next.config.mjs?isolation-test=${mode}`);
      assert.equal(configuration.distDir, mode === 'local' ? '.next-isolated' : '.next');
    }
  } finally {
    if (original === undefined) delete process.env.MEMBER_HUB_ENVIRONMENT;
    else process.env.MEMBER_HUB_ENVIRONMENT = original;
  }
});
