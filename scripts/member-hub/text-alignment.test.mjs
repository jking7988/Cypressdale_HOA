import test from 'node:test';
import assert from 'node:assert/strict';
import { blockTextAlignment } from '../../lib/member-hub/text-alignment.ts';

test('paragraph alignment accepts only the three supported directions', () => {
  for (const textAlign of ['left', 'center', 'right']) assert.equal(blockTextAlignment({ textAlign }), textAlign);
  for (const value of [undefined, null, {}, { textAlign: 'justify' }, { textAlign: 'inherit' }, { textAlign: 1 }, 'center']) {
    assert.equal(blockTextAlignment(value), undefined);
  }
});
