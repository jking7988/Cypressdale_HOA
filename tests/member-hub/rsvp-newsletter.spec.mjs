import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {getLocalStatus,seedAdmin,localAdmin} from '../../scripts/member-hub/local.mjs';
import {centralDate} from '../../lib/newsletter/template.ts';
async function login(page) {
  await page.goto('/admin-sign-in'); await page.getByLabel('Email',{exact:true}).fill(localAdmin.email);
  await page.getByLabel('Password',{exact:true}).fill(localAdmin.password);
  await page.getByRole('button',{name:'Sign In',exact:true}).click(); await expect(page).toHaveURL(/\/admin\/content$/);
}
async function mail(request,email,subject) {
  let message;
  await expect.poll(async()=>{
    const data=await (await request.get('http://127.0.0.1:55424/api/v1/messages')).json();
    message=data.messages.find(item=>item.Subject===subject && item.To.some(to=>to.Address===email)); return !!message;
  }).toBe(true);
  return (await request.get(`http://127.0.0.1:55424/api/v1/message/${message.ID}`)).json();
}

test('old UUID newsletter confirmations provide a renewal path without changing consent', async ({page,request}) => {
  const response = await page.goto(`/api/newsletter/verify?token=${randomUUID()}`);
  expect(response.status()).toBe(410);
  await expect(page.getByText('Your subscription has not been changed.',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Return to Cypressdale HOA'})).toHaveAttribute('href','/');
  expect((await request.get('/api/newsletter/verify?token=invalid')).status()).toBe(400);
});

test('RSVPs change and cancel without duplicates; pending/revoked users are denied and cleared users retain totals',async({page,request})=>{
  const {service}=await seedAdmin(), status=getLocalStatus(), id=`rsvp-${randomUUID()}`;
  let resident;
  expect((await service.from('hoa_content').insert({id,kind:'event',title:'Local RSVP Fixture',status:'published',visibility:'public',settings:{rsvpYes:4,rsvpMaybe:2,startDate:new Date(Date.now()+86400000).toISOString()}})).error).toBeNull();
  try {
    expect((await request.post('/api/rsvp',{data:{eventId:id,response:'yes'}})).status()).toBe(401);
    const email=`${id}@example.test`,password='RsvpFixture2026!';
    const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'RSVP Resident',address:'1 Test Lane'}});
    expect(created.error).toBeNull(); resident=created.data.user.id;
    const client=createClient(status.API_URL,status.ANON_KEY,{auth:{persistSession:false}});
    const signed=await client.auth.signInWithPassword({email,password}); expect(signed.error).toBeNull();
    const headers={Authorization:`Bearer ${signed.data.session.access_token}`};
    expect((await request.post('/api/rsvp',{headers,data:{eventId:id,response:'yes'}})).status()).toBe(403);
    await service.from('hoa_profiles').update({membership_status:'approved'}).eq('id',resident);
    for(let i=0;i<3;i++) expect((await request.post('/api/rsvp',{headers,data:{eventId:id,response:'yes',name:'Impersonated'}})).status()).toBe(200);
    expect((await (await request.get(`/api/rsvp?eventId=${id}`)).json()).yes).toBe(5);
    expect((await service.from('hoa_rsvps').select('display_name').eq('content_id',id)).data).toEqual([{display_name:'RSVP Resident'}]);
    await service.from('hoa_profiles').update({membership_status:'revoked'}).eq('id',resident);
    expect((await request.post('/api/rsvp',{headers,data:{eventId:id,response:'maybe'}})).status()).toBe(403);
    await service.auth.admin.deleteUser(resident);resident=null;
    expect((await service.from('hoa_rsvps').select('author_id,display_name').eq('content_id',id)).data).toEqual([{author_id:null,display_name:'User Cleared'}]);
    await login(page); await page.goto(`/events/${id}`);
    const controls=page.getByRole('region',{name:'Event RSVP'});
    await controls.getByRole('button',{name:"I'm going",exact:true}).click();
    await expect(controls.getByText('6 going | 2 maybe',{exact:true})).toBeVisible();
    await controls.getByRole('button',{name:'Maybe',exact:true}).click();
    await expect(controls.getByText('5 going | 3 maybe',{exact:true})).toBeVisible();
    await controls.getByRole('button',{name:'Remove RSVP',exact:true}).click();
    await expect(controls.getByText('5 going | 2 maybe',{exact:true})).toBeVisible();
    await page.goto('/events');
    const card=page.locator(`[id="${id}"]`); await card.getByRole('button',{name:"I'm going",exact:true}).click();
    await page.getByRole('dialog',{name:'RSVP',exact:true}).getByRole('button',{name:'Submit RSVP',exact:true}).click();
    await expect(card.getByText('6 going',{exact:true})).toBeVisible();
  } finally {if(resident)await service.auth.admin.deleteUser(resident);await service.from('hoa_content').delete().eq('id',id);}
});

test('newsletter confirmations, consent, private filtering, Mailpit delivery and duplicate-send protection',async({page,request},info)=>{
  test.setTimeout(120000);
  const {service}=await seedAdmin(), prefix=`newsletter-${randomUUID()}`, email=`${prefix}@example.test`;
  const ids=[`${prefix}-public`,`${prefix}-private`,`${prefix}-draft`];
  const unconfirmed=`${prefix}-unconfirmed@example.test`,inactive=`${prefix}-inactive@example.test`;
  const before=await service.from('newsletter_runs').select('id').eq('run_key',`mailpit:${centralDate()}`).maybeSingle();
  let runId;
  try {
    expect((await service.from('hoa_content').insert(ids.map((id,i)=>({id,kind:'post',title:i===0?'Public <script>Fixture</script>':id,status:i===2?'draft':'published',visibility:i===1?'members':'public',settings:{newsDate:new Date().toISOString()}})))).error).toBeNull();
    expect((await request.get('/api/newsletter/send?force=1')).status()).toBe(401);
    expect((await request.post('/api/newsletter/send')).status()).toBe(401);
    expect((await request.get('/api/newsletter/preview')).status()).toBe(401);
    expect((await request.post('/api/newsletter',{data:{email,name:'Newsletter Fixture'}})).status()).toBe(200);
    let sub=(await service.from('newsletter_subscribers').select('*').eq('email',email).single()).data;
    expect(sub.active).toBe(false);expect(sub.verified).toBe(false);
    const confirmation=await mail(request,email,'Confirm your Cypressdale newsletter subscription');
    const url=confirmation.HTML.match(/href="([^"]+)"/)[1].replace(/&amp;/g,'&');expect(new URL(url).origin).toBe('http://localhost:3002');
    await page.goto(url);expect((await service.from('newsletter_subscribers').select('verified').eq('email',email).single()).data.verified).toBe(false);
    await page.getByRole('button',{name:'Confirm subscription',exact:true}).click();
    await expect(page.getByText('Your newsletter subscription is confirmed.',{exact:true})).toBeVisible();
    expect((await request.post('/api/newsletter/verify',{form:{token:new URL(url).searchParams.get('token')}})).status()).toBe(400);
    await login(page);await page.goto('/admin/newsletter');
    const preview=await (await page.request.get('/api/newsletter/preview')).json();
    expect(preview.items.some(item=>item.id===ids[0])).toBe(true);
    expect(preview.items.some(item=>ids.slice(1).includes(item.id))).toBe(false);
    expect(preview.html).toContain('&lt;script&gt;');expect(preview.html).not.toContain('<script>');
    expect((await service.from('newsletter_subscribers').insert([{email:unconfirmed,active:true,verified:false},
      {email:inactive,active:false,verified:true}])).error).toBeNull();
    await page.screenshot({path:info.outputPath('newsletter-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath('newsletter-mobile.png'),fullPage:true});
    if(!before.data) {
      const responses=await Promise.all([page.request.post('/api/newsletter/send'),page.request.post('/api/newsletter/send')]);
      for(const response of responses)expect(response.status()).toBe(200);
      const bodies=await Promise.all(responses.map(response=>response.json()));runId=bodies[0].runId;
      for(let i=0;i<5;i++) {
        const r=await page.request.post('/api/newsletter/send');expect(r.status()).toBe(200); const b=await r.json();if(!b.pending)break;
      }
      const delivered=await mail(request,email,'Cypressdale News & Events Update');
      expect(delivered.HTML).toContain('Public &lt;script&gt;Fixture&lt;/script&gt;');
      expect(delivered.HTML).not.toContain(ids[1]);expect(delivered.HTML).not.toContain(ids[2]);
      const duplicate=await (await page.request.post('/api/newsletter/send')).json();expect(duplicate.reason).toBe('already-sent-today');
      const jobs=await service.from('newsletter_deliveries').select('status,attempts').eq('run_id',runId);
      expect(jobs.data.every(job=>job.status==='sent'&&job.attempts===1)).toBe(true);
      const excluded=(await service.from('newsletter_subscribers').select('id').in('email',[unconfirmed,inactive])).data.map(sub=>sub.id);
      expect((await service.from('newsletter_deliveries').select('id').eq('run_id',runId).in('subscriber_id',excluded)).data).toEqual([]);
    }
    sub=(await service.from('newsletter_subscribers').select('*').eq('email',email).single()).data;
    await page.goto(`/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`);
    await expect(page.getByLabel('Email address')).toHaveValue(email);
    expect((await service.from('newsletter_subscribers').select('active').eq('email',email).single()).data.active).toBe(true);
    const inboxBefore = await (await request.get('http://127.0.0.1:55424/api/v1/messages')).json();
    expect(inboxBefore.messages.some(item=>item.Subject==='Manage your Cypressdale newsletter subscription' && item.To.some(to=>to.Address===email))).toBe(false);
    await page.getByRole('button',{name:'Email unsubscribe link',exact:true}).click();
    await expect(page.getByText('If subscribed, you will receive an email to manage your subscription.',{exact:true})).toBeVisible();
    const cooldownInbox = await (await request.get('http://127.0.0.1:55424/api/v1/messages')).json();
    expect(cooldownInbox.messages.some(item=>item.Subject==='Manage your Cypressdale newsletter subscription' && item.To.some(to=>to.Address===email))).toBe(false);
    expect((await service.from('newsletter_subscribers').update({verification_sent_at:new Date(Date.now()-120000).toISOString()}).eq('email',email)).error).toBeNull();
    await page.goto(`/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`);
    await page.getByRole('button',{name:'Email unsubscribe link',exact:true}).click();
    await expect(page.getByText('If subscribed, you will receive an email to manage your subscription.',{exact:true})).toBeVisible();
    const management = await mail(request,email,'Manage your Cypressdale newsletter subscription');
    const unsubscribeUrl = management.HTML.match(/href="([^"]+)"/)[1].replace(/&amp;/g,'&');
    expect(new URL(unsubscribeUrl).searchParams.get('token')).toBe(sub.unsubscribe_token);
    expect((await request.get('/api/newsletter/unsubscribe?email=invalid')).status()).toBe(400);
    expect((await request.get(`/api/newsletter/unsubscribe?token=invalid&email=${encodeURIComponent(email)}`)).status()).toBe(400);
    await page.goto(unsubscribeUrl);
    expect((await service.from('newsletter_subscribers').select('active').eq('email',email).single()).data.active).toBe(true);
    await page.getByRole('button',{name:'Unsubscribe',exact:true}).click();
    expect((await service.from('newsletter_subscribers').select('active').eq('email',email).single()).data.active).toBe(false);
    await service.from('newsletter_subscribers').update({verification_sent_at:new Date(Date.now()-120000).toISOString()}).eq('email',email);
    expect((await request.post('/api/newsletter/manage',{data:{email,action:'resubscribe'}})).status()).toBe(200);
    expect((await service.from('newsletter_subscribers').select('active').eq('email',email).single()).data.active).toBe(false);
  }finally {
    if(!before.data){runId=runId||(await service.from('newsletter_runs').select('id').eq('run_key',`mailpit:${centralDate()}`).maybeSingle()).data?.id;if(runId)await service.from('newsletter_runs').delete().eq('id',runId);}
    await service.from('newsletter_subscribers').delete().in('email',[email,unconfirmed,inactive]);await service.from('hoa_content').delete().in('id',ids);
  }
});
