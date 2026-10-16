import { readFile } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { projectRoot } from './local.mjs';
import { hubConfig, hubServiceRoleKey } from '../../lib/member-hub/config.ts';
import { newsletterDelivery } from '../../lib/newsletter/delivery-config.ts';

export function hostedDevelopmentEnvironment(values) {
  if (values.VERCEL || values.VERCEL_ENV) throw new Error('Hosted-data development is loopback-only, never a Vercel deployment.');
  const testRecipients = (values.MEMBER_HUB_NEWSLETTER_TEST_RECIPIENTS || '').trim();
  const environment = { ...values, NODE_ENV: 'development',
    MEMBER_HUB_ENABLED: 'true', MEMBER_HUB_ENVIRONMENT: 'hosted-development',
    MEMBER_HUB_SHARED_DATABASE: 'true',
    MEMBER_HUB_SITE_URL: 'http://localhost:3001', MEMBER_HUB_PRODUCTION_READY: 'false',
    MEMBER_HUB_SUPABASE_URL: values.NEXT_PUBLIC_SUPABASE_URL,
    MEMBER_HUB_PRODUCTION_SUPABASE_URL: values.NEXT_PUBLIC_SUPABASE_URL,
    MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY: values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || values.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    MEMBER_HUB_SUPABASE_SERVICE_ROLE_KEY: values.SUPABASE_SERVICE_ROLE_KEY,
    NEWSLETTER_DELIVERY_ENABLED: testRecipients ? 'true' : 'false', NEWSLETTER_DELIVERY_MODE: 'test',
    NEWSLETTER_PRODUCTION_DELIVERY_READY: 'false' };
  if (!environment.MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY) throw new Error('Add NEXT_PUBLIC_SUPABASE_ANON_KEY to your existing .env.local using the same public key as Vercel. Never use the service-role key here.');
  hubConfig(environment); hubServiceRoleKey(environment);
  if (testRecipients && newsletterDelivery(environment).transport !== 'resend') throw new Error('Local test email requires valid MEMBER_HUB_NEWSLETTER_TEST_RECIPIENTS, NEWSLETTER_FROM and RESEND_API_KEY. No server was started.');
  if (!testRecipients) delete environment.RESEND_API_KEY;
  delete environment.CRON_SECRET;
  delete environment.NEWSLETTER_CRON_SECRET;
  return environment;
}

export async function verifyHostedConnection(environment, fetcher = fetch) {
  const configuration = hubConfig(environment);
  for (const [table, key] of [['hoa_content', configuration.publishableKey], ['hoa_profiles', hubServiceRoleKey(environment)]]) {
    const response = await fetcher(new URL(`/rest/v1/${table}?select=id&limit=0`, configuration.url), {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) throw new Error(`Hosted development credentials or schema could not be verified (HTTP ${response.status}). No data was changed.`);
    await response.body?.cancel();
  }
}

async function main() {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: projectRoot, encoding: 'utf8' }).trim();
  const filenames = [...new Set([path.join(path.dirname(common), '.env.local'), path.join(projectRoot, '.env.local')])];
  let values = {};
  for (const filename of filenames) {
    try { values = { ...values, ...parseEnv(await readFile(filename, 'utf8')) }; }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('Unable to read private hosted-development settings.'); }
  }
  const environment = hostedDevelopmentEnvironment({ ...values, ...process.env });
  await verifyHostedConnection(environment);
  console.log('Hosted-data development: http://localhost:3001');
  console.log('WARNING: Content, file and account edits change the LIVE hosted database immediately. Code changes stay local until pushed.');
  const delivery = newsletterDelivery(environment);
  console.log(delivery.transport === 'resend' ? `Newsletter test delivery is restricted to ${delivery.recipients.length} configured address(es). Subscriber-wide and scheduled sending are disabled.`
    : 'Newsletter delivery is disabled.');
  console.log('Supabase Auth emails still use the hosted SMTP configuration. No seed, migration or email-send commands are run at startup.');
  if (process.argv.includes('--check')) return;
  const cli = fileURLToPath(new URL('../../node_modules/next/dist/bin/next', import.meta.url));
  const child = spawn(process.execPath, [cli, 'dev', '--hostname', '127.0.0.1', '--port', '3001'], { cwd: projectRoot, env: environment, stdio: 'inherit' });
  child.on('error', () => { console.error('Unable to start the development server.'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 0; });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
