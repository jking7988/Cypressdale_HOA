import { test, expect } from '@playwright/test';

test('public and account responses prevent MIME sniffing and cross-origin framing', async ({ request }) => {
  for (const route of ['/', '/admin-sign-in', '/holiday-decorating/halloween']) {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('SAMEORIGIN');
  }
  const privateResponse = await request.get('/api/newsletter/preview');
  expect(privateResponse.status()).toBe(401);
  expect(privateResponse.headers()['cache-control']).toContain('no-store');
});
