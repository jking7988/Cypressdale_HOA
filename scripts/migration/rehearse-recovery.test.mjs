import test from 'node:test';
import assert from 'node:assert/strict';
import { validateArchiveEntries, validateRecoveryDatabase } from './rehearse-recovery.mjs';

test('restore operations can only address generated rehearsal databases', () => {
  assert.equal(validateRecoveryDatabase(`hoa_restore_${'a'.repeat(32)}`), `hoa_restore_${'a'.repeat(32)}`);
  for (const name of ['postgres', 'template0', 'hoa_restore_', 'hoa_restore_foo;drop database postgres']) {
    assert.throws(() => validateRecoveryDatabase(name), /Refusing/);
  }
});

test('storage extraction refuses traversal, absolute paths and Windows drive paths', () => {
  assert.equal(validateArchiveEntries('./\n./stub/stub/hoa-content/file/version\n').length, 2);
  for (const listing of ['', '../escape', './safe/../../escape', '/etc/passwd', 'C:/escape', '.\\escape']) {
    assert.throws(() => validateArchiveEntries(listing), /Unsafe or empty/);
  }
});
