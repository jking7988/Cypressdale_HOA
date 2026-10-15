import assert from 'node:assert/strict';
import test from 'node:test';
import { safeHubRedirect, profileSchema, emailSchema, passwordSchema } from '../../lib/member-hub/forms.ts';

test('confirmation redirects cannot leave the member account flow', () => {
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/news', '/members\r\nhttps://evil.test']) {
    assert.equal(safeHubRedirect(path), '/members');
  }
  assert.equal(safeHubRedirect('/reset-password'), '/reset-password');
  assert.equal(safeHubRedirect('/members/accept-invite?id=test'), '/members/accept-invite?id=test');
});

test('account forms normalize resident details and reject incomplete registrations', () => {
  assert.equal(emailSchema.parse(' Resident@Example.test '), 'resident@example.test');
  assert.deepEqual(profileSchema.parse({ full_name: ' Test Resident ', address: ' 123 Test Street ', role: 'admin' }),
    { full_name: 'Test Resident', address: '123 Test Street' });
  assert.throws(() => profileSchema.parse({ full_name: '', address: '' }));
  assert.throws(() => passwordSchema.parse('short'));
});
