import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSchema, plainTitle, titleEditorValue } from '../../lib/member-hub/content.ts';

const record = { id: 'rich-title-fixture', kind: 'post', title: 'Legacy title', slug: null, status: 'draft', visibility: 'public', body: [], sections: [], settings: {} };

test('legacy titles initialize without losing text and rich titles supply plain listing text', () => {
  const value = titleEditorValue('Existing title', undefined);
  assert.equal(plainTitle(value), 'Existing title');
  value[0].textAlign = 'center';
  value[0].children[0].marks = ['strong'];
  value.push({ ...value[0], _key: 'second', children: [{ _type: 'span', _key: 'second-span', text: 'Second line', marks: [] }] });
  assert.equal(plainTitle(value), 'Existing title Second line');
  assert.equal(titleEditorValue('Fallback', value), value);
  for (const kind of ['post', 'event', 'page']) {
    const result = contentSchema.parse({ ...record, kind, settings: { titleRichText: value } });
    assert.equal(result.title, 'Existing title Second line');
    assert.deepEqual(result.settings.titleRichText, value);
  }
  assert.equal(contentSchema.parse(record).title, 'Legacy title');
});

test('blank, malformed and excessively long rich titles cannot replace a saved title', () => {
  for (const titleRichText of [[], 'invalid', [null], titleEditorValue(' '.repeat(4)), titleEditorValue('x'.repeat(301))]) {
    assert.equal(contentSchema.safeParse({ ...record, settings: { titleRichText } }).success, false);
  }
  assert.equal(plainTitle([{ _type: 'block', children: [{ _type: 'span', text: 'Safe title' }, { _type: 'object' }] }]), 'Safe title');
});
