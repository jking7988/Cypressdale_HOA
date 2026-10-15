import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getLocalStatus, seedAdmin } from '../../scripts/member-hub/local.mjs';

test('scanner GETs do not consume a recovery token; confirmation sets a password without changing permissions', async ({page,request}) => {
  const {service}=await seedAdmin();
  const email=`recovery-${randomUUID()}@example.test`;
  const created=await service.auth.admin.createUser({email,email_confirm:true});
  expect(created.error).toBeNull();
  const id=created.data.user.id;
  try {
    const generated=await service.auth.admin.generateLink({type:'recovery',email});
    expect(generated.error).toBeNull();
    const token=generated.data.properties.hashed_token;
    const link=`/auth/confirm?token_hash=${encodeURIComponent(token)}&type=recovery&next=/reset-password`;
    for(let i=0;i<2;i++) {
      const scanned=await request.get(link);
      expect(scanned.status()).toBe(200);
      expect(scanned.headers()['cache-control']).toContain('no-store');
      expect(scanned.headers()['referrer-policy']).toBe('strict-origin');
      expect(scanned.headers()['set-cookie']).toBeUndefined();
    }
    expect((await request.post('/auth/confirm',{headers:{Origin:'https://untrusted.example'},form:{token_hash:token,type:'recovery',next:'/reset-password'}})).status()).toBe(403);
    await page.goto(link);
    await page.getByRole('button',{name:'Continue to password reset',exact:true}).click();
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel('New Password',{exact:true}).fill('RecoveryFixturePassword2026!');
    await page.getByLabel('Confirm Password',{exact:true}).fill('RecoveryFixturePassword2026!');
    await page.getByRole('button',{name:'Save Password',exact:true}).click();
    await expect(page).toHaveURL(/\/members$/);
    const profile=await service.from('hoa_profiles').select('role,membership_status').eq('id',id).single();
    expect(profile.data).toEqual({role:'resident',membership_status:'pending'});
    await page.goto(link);
    await page.getByRole('button',{name:'Continue to password reset',exact:true}).click();
    await expect(page).toHaveURL(/\/login\?link=expired$/);
  } finally { await service.auth.admin.deleteUser(id); }
});

test('default Supabase verification URLs finish the PKCE recovery flow', async ({page,request}) => {
  const {service}=await seedAdmin(), status=getLocalStatus();
  const email=`pkce-${randomUUID()}@example.test`;
  const created=await service.auth.admin.createUser({email,email_confirm:true});
  expect(created.error).toBeNull();
  try {
    await page.goto('/forgot-password');
    await page.getByLabel('Email',{exact:true}).fill(email);
    await page.getByRole('button',{name:'Send Reset Link',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('If an account exists');
    let message;
    await expect.poll(async()=>{
      const inbox=await (await request.get('http://127.0.0.1:55424/api/v1/messages')).json();
      message=inbox.messages.find(item=>item.Subject.includes('Reset your')&&item.To.some(to=>to.Address===email));
      return !!message;
    }).toBe(true);
    const mail=await (await request.get(`http://127.0.0.1:55424/api/v1/message/${message.ID}`)).json();
    const custom=new URL(mail.HTML.match(/href="([^"]+)"/)[1].replace(/&amp;/g,'&'));
    const standard=new URL('/auth/v1/verify',status.API_URL);
    standard.searchParams.set('token',custom.searchParams.get('token_hash'));
    standard.searchParams.set('type','recovery');
    standard.searchParams.set('redirect_to','http://localhost:3001/auth/confirm?next=/reset-password');
    await page.goto(standard.toString());
    await expect(page).toHaveURL(/\/auth\/confirm\?.*code=/);
    await page.getByRole('button',{name:'Continue to password reset',exact:true}).click();
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByLabel('New Password',{exact:true})).toBeVisible();
  } finally { await service.auth.admin.deleteUser(created.data.user.id); }
});
