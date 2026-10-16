import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';
import { centralDate } from '../../lib/newsletter/template.ts';
import { newsletterCampaignKey } from '../../lib/newsletter/campaign.ts';

test('explicit admin resends preserve the daily guard, replay safely and require a separate UI confirmation', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const { service, id: adminId } = await seedAdmin(), prefix = `resend-${randomUUID()}`, resendId = randomUUID();
  const email = `${prefix}@example.test`, normalKey = `mailpit:${centralDate()}`;
  const previous = (await service.from('newsletter_runs').select('id,sent_at').eq('run_key', normalKey).maybeSingle()).data;
  let normalId, overrideId;
  try {
    expect((await service.from('hoa_content').insert({ id: prefix, kind: 'post', title: prefix, status: 'published', visibility: 'public', settings: { newsDate: '2099-12-31' } })).error).toBeNull();
    expect((await service.from('newsletter_subscribers').insert({ email, active: true, verified: true })).error).toBeNull();
    if (!previous) {
      const normal = await service.from('newsletter_runs').insert({ run_key: normalKey, transport: 'mailpit', payload: {}, sent_at: new Date().toISOString() }).select('id').single();
      expect(normal.error).toBeNull(); normalId = normal.data.id;
    }
    const data = { overrideDailyLimit: true, resendRequestId: resendId };
    expect((await request.post('/api/newsletter/send', { data })).status()).toBe(401);
    expect((await request.post('/api/newsletter/webhook', { data })).status()).toBe(401);
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/); await page.goto('/admin/newsletter');
    expect((await page.request.post('/api/newsletter/send', { data: { overrideDailyLimit: true } })).status()).toBe(400);
    if (!previous || previous.sent_at) expect((await (await page.request.post('/api/newsletter/send')).json()).reason).toBe('already-sent-today');
    const results = await Promise.all([page.request.post('/api/newsletter/send', { data }), page.request.post('/api/newsletter/send', { data })]);
    for (const result of results) expect(result.status()).toBe(200);
    const bodies = await Promise.all(results.map(result => result.json())); overrideId = bodies[0].runId;
    expect(overrideId).toBeTruthy(); expect(bodies[1].runId).toBe(overrideId);
    for (let index = 0; index < 5; index++) {
      const retry = await (await page.request.post('/api/newsletter/send', { data })).json();
      if (retry.reason === 'already-sent-request') break;
    }
    expect((await (await page.request.post('/api/newsletter/send', { data })).json()).reason).toBe('already-sent-request');
    const run = (await service.from('newsletter_runs').select('run_key,payload,sent_at').eq('id', overrideId).single()).data;
    expect(run.run_key).toBe(newsletterCampaignKey('mailpit', centralDate(), resendId));
    expect(run.payload.manualResend).toBe(true); expect(run.payload.resendRequestId).toBe(resendId); expect(run.payload.requestedBy).toBe(adminId);
    expect(run.sent_at).toBeTruthy();
    const subscriber = (await service.from('newsletter_subscribers').select('id').eq('email', email).single()).data;
    const jobs = (await service.from('newsletter_deliveries').select('status,attempts').eq('run_id', overrideId).eq('subscriber_id', subscriber.id)).data;
    expect(jobs).toEqual([{ status: 'sent', attempts: 1 }]);
    const messages = await (await request.get('http://127.0.0.1:55424/api/v1/messages')).json();
    expect(messages.messages.filter(message => message.To.some(to => to.Address === email))).toHaveLength(1);
    if (!previous || previous.sent_at) expect((await (await page.request.post('/api/newsletter/send')).json()).reason).toBe('already-sent-today');
    await page.reload(); await expect(page.getByText('Manual Resend', { exact: true })).toBeVisible();
    const posts = [];
    await page.route('**/api/newsletter/send', async route => {
      const body = route.request().postDataJSON(); posts.push(body);
      if (!body.overrideDailyLimit) return route.fulfill({ json: { sent: 0, reason: 'already-sent-today' } });
      const attempt = posts.filter(post => post.overrideDailyLimit).length;
      return route.fulfill({ status: attempt === 1 ? 502 : 200, json: attempt === 1 ? { error: 'Retry the unsent deliveries.' } : { sent: 1, pending: 0, transport: 'mailpit' } });
    });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Send to Mailpit', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Use Send Again');
    let confirmation;
    page.once('dialog', async dialog => { confirmation = dialog.message(); await dialog.dismiss(); });
    await page.getByRole('button', { name: 'Send Again', exact: true }).click();
    expect(confirmation).toContain('Override the once-per-day limit'); expect(posts).toHaveLength(1);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Send Again', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Retry the unsent deliveries.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send to Mailpit', exact: true })).toBeDisabled();
    page.once('dialog', async dialog => { confirmation = dialog.message(); await dialog.accept(); });
    await page.getByRole('button', { name: 'Retry Resend', exact: true }).click();
    expect(confirmation).toContain('Only unsent deliveries');
    await expect(page.getByRole('status')).toContainText('1 sent');
    expect(posts[1].resendRequestId).toBe(posts[2].resendRequestId);
    await expect(page.getByRole('button', { name: 'Send Again', exact: true })).toBeEnabled();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('newsletter-resend-mobile.png'), fullPage: true });
  } finally {
    overrideId ||= (await service.from('newsletter_runs').select('id').eq('run_key', newsletterCampaignKey('mailpit', centralDate(), resendId)).maybeSingle()).data?.id;
    if (overrideId) await service.from('newsletter_runs').delete().eq('id', overrideId);
    if (normalId) await service.from('newsletter_runs').delete().eq('id', normalId);
    await service.from('newsletter_subscribers').delete().eq('email', email);
    await service.from('hoa_content').delete().eq('id', prefix);
  }
});
