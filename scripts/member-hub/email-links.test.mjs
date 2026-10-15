import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEmailLink } from '../../lib/member-hub/email-links.ts';

test('email callbacks support standard PKCE codes and custom token hashes', () => {
  const code = '12345678-1234-1234-1234-123456789012';
  assert.deepEqual(parseEmailLink(new URLSearchParams({ code })), { mode: 'code', code });
  for (const type of ['signup', 'recovery', 'invite', 'email']) {
    const tokenHash = 'a'.repeat(64);
    assert.deepEqual(parseEmailLink(new URLSearchParams({ token_hash: tokenHash, type })), { mode: 'otp', tokenHash, type });
  }
});
test('email callback validation rejects mixed, duplicated, malformed and provider-error credentials', () => {
  for (const query of ['', 'code=short', 'code=%22%3E%3Cscript%3E', 'token_hash='+ 'a'.repeat(64)+'&type=unknown',
    'code='+ 'a'.repeat(40)+'&code='+ 'b'.repeat(40), 'code='+ 'a'.repeat(40)+'&token_hash='+ 'b'.repeat(64),
    'code='+ 'a'.repeat(40)+'&error=access_denied']) assert.equal(parseEmailLink(new URLSearchParams(query)), null);
});
