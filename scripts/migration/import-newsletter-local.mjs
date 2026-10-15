import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getLocalStatus, projectRoot } from '../member-hub/local.mjs';

const root = path.join(projectRoot, 'backups');
const option = process.argv.indexOf('--source-env');
let directory;
const hash = value => createHash('sha256').update(value).digest('hex');
if (option !== -1) {
  if (!process.argv[option + 1]) throw new Error('Provide the source environment file path.');
  const env = parseEnv(await readFile(path.resolve(projectRoot,process.argv[option + 1]),'utf8'));
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL || '');
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('A hosted source Supabase and read credentials are required.');
  const source = createClient(url.origin,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const subscribers = [];
  for (let offset=0;;offset+=1000) {
    const result = await source.from('newsletter_subscribers').select('id,email,name,street,active,verified').order('id').range(offset,offset+999);
    if (result.error) throw new Error('Read-only source newsletter export failed.');
    subscribers.push(...result.data); if (result.data.length < 1000) break;
  }
  const history = await source.from('newsletter_runs').select('sent_at').order('sent_at').limit(1000);
  if (history.error) throw new Error('Read-only newsletter history export failed.');
  const raw = JSON.stringify({version:1,exportedAt:new Date().toISOString(),sourceOrigin:url.origin,subscribers,history:history.data},null,2);
  directory = path.join(root,`newsletter-${new Date().toISOString().replace(/[:.]/g,'-')}`);
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'data.json'),raw,{flag:'wx'});
  await writeFile(path.join(directory,'manifest.json'),JSON.stringify({sha256:hash(raw),subscribers:subscribers.length,history:history.data.length,complete:true}),{flag:'wx'});
  console.log(`Read-only newsletter backup complete: ${subscribers.length} subscribers, ${history.data.length} archived runs.`);
} else {
  const names = (await readdir(root)).filter(name=>name.startsWith('newsletter-')).sort().reverse();
  for (const name of names) {
    const candidate = path.join(root,name);
    try { if (JSON.parse(await readFile(path.join(candidate,'manifest.json'),'utf8')).complete) {directory=candidate;break;} } catch { /* Skip incomplete exports. */ }
  }
}
if (!directory) throw new Error('No verified newsletter backup found. Supply --source-env for a read-only export.');
const raw = await readFile(path.join(directory,'data.json'),'utf8');
const manifest = JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));
if (hash(raw)!==manifest.sha256) throw new Error('Newsletter backup checksum mismatch.');
const data = JSON.parse(raw), status = getLocalStatus();
const target = createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let imported=0;
for (const subscriber of data.subscribers) {
  const email = String(subscriber.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('An exported subscriber has an invalid email; review the private backup.');
  const result = await target.rpc('hoa_import_newsletter_subscriber',{document:{email,name:subscriber.name || null,street:subscriber.street || null,
    active:subscriber.active===true,verified:subscriber.verified===true}});
  if(result.error) throw new Error('Local newsletter import failed.'); if(result.data) imported++;
}
console.log(`Local newsletter import: ${imported} added, ${data.subscribers.length-imported} existing or removed records preserved. No source records changed or emails sent.`);
