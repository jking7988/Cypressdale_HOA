import assert from 'node:assert/strict';
import test from 'node:test';
import { groupContent, filterContent } from '../../lib/member-hub/content-directory.ts';

const saved = { id: 'one', title: 'Live title', kind: 'post', status: 'published', visibility: 'public', version: 1 };
const draft = { ...saved, id: 'drafts.one', title: 'Working title', status: 'draft' };

test('content versions form one row regardless of order, with the draft as the editing version', () => {
  for (const records of [[saved, draft], [draft, saved]]) {
    const original = JSON.stringify(records);
    const groups = groupContent(records);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].id, 'one');
    assert.equal(groups[0].current, draft);
    assert.equal(groups[0].saved, saved);
    assert.equal(groups[0].draft, draft);
    assert.equal(JSON.stringify(records), original);
  }
});

test('combined rows are searchable by either title and appear under both applicable status filters', () => {
  const groups = groupContent([draft, saved]);
  for (const query of ['Live title', 'Working title', ' working ']) assert.equal(filterContent(groups, query, 'all', 'all').length, 1);
  for (const status of ['published', 'draft', 'all']) assert.equal(filterContent(groups, '', 'post', status).length, 1);
  assert.equal(filterContent(groups, '', 'event', 'all').length, 0);
  assert.equal(filterContent(groups, 'unrelated', 'all', 'all').length, 0);
});

test('standalone drafts and identical titles remain separate unless their canonical IDs match', () => {
  const standalone = { ...draft, id: 'drafts.two' };
  const unpublished = { ...saved, id: 'three', status: 'draft' };
  const sameTitle = { ...saved, id: 'four' };
  const groups = groupContent([standalone, saved, unpublished, sameTitle]);
  assert.deepEqual(groups.map(group => group.id), ['two', 'one', 'three', 'four']);
  assert.equal(groups[0].saved, undefined);
  assert.equal(groups[0].current, standalone);
  assert.equal(filterContent(groups, '', 'all', 'draft').length, 2);
  assert.equal(filterContent(groups, '', 'all', 'published').length, 2);
  assert.equal(groupContent([saved])[0].current, saved);
});
