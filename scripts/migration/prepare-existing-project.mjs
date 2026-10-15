import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRoot } from '../member-hub/local.mjs';

const migrationNames = [
  '202610140001_member_hub.sql', '202610140002_member_directory.sql',
  '202610140003_content_editor.sql', '202610140004_retired_imports.sql',
  '202610140005_rsvp_newsletter.sql', '202610140006_newsletter_limits.sql',
  '202610140007_subscriber_removal.sql', '202610140008_content_type.sql',
  '202610140009_document_folders.sql', '202610140010_asset_libraries.sql',
  '202610140011_program_pages.sql', '202610140012_content_removal.sql',
  '202610140013_holiday_pages.sql',
];
const sha256 = value => createHash('sha256').update(value).digest('hex');

export function adaptNewsletterSchema(sql, subscriberChanges) {
  const start = sql.indexOf('create table public.newsletter_subscribers (');
  const end = sql.indexOf('create table public.newsletter_runs (');
  if (start < 0 || end <= start || sql.indexOf('create table public.newsletter_subscribers (', start + 1) !== -1) {
    throw new Error('Newsletter migration boundaries changed; review the baseline adapter.');
  }
  return sql.slice(0, start) + subscriberChanges + '\n' + sql.slice(end);
}

export async function buildExistingProjectBaseline() {
  const directory = path.join(projectRoot, 'supabase/migrations');
  const actual = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  if (JSON.stringify(actual) !== JSON.stringify(migrationNames)) throw new Error('Migration chain changed; review the existing-project baseline before generating it.');
  const preflight = await readFile(new URL('./existing-project-preflight.sql', import.meta.url), 'utf8');
  const subscribers = await readFile(new URL('./existing-project-subscribers.sql', import.meta.url), 'utf8');
  const hardening = await readFile(new URL('./existing-project-hardening.sql', import.meta.url), 'utf8');
  const sources = [], parts = [];
  for (const name of migrationNames) {
    let sql = await readFile(path.join(directory, name), 'utf8');
    sources.push({ name, sha256: sha256(sql) });
    const subscriberMarker = '-- EXISTING_PROJECT_SUBSCRIBER_ADAPTER --';
    if (name === '202610140005_rsvp_newsletter.sql') sql = adaptNewsletterSchema(sql, subscriberMarker);
    // Adapt only this reviewed migration chain; historical source files stay unchanged.
    sql = sql.replaceAll('public.newsletter_runs', 'public.hoa_newsletter_runs')
      .replaceAll('public.newsletter_deliveries', 'public.hoa_newsletter_deliveries');
    // Legacy history statements in the additive adapter intentionally keep their name.
    if (name === '202610140005_rsvp_newsletter.sql') {
      sql = sql.replace(subscriberMarker, () => subscribers);
    }
    const lines = sql.trim().split(/\r?\n/);
    if (lines[0] !== 'begin;' || lines.at(-1) !== 'commit;') throw new Error(`Unexpected transaction wrapper in ${name}.`);
    parts.push(`-- Source: ${name}\n${lines.slice(1, -1).join('\n')}`);
  }
  sources.push({ name: 'existing-project-hardening.sql', sha256: sha256(hardening) });
  const sql = `-- PREPARATION CANDIDATE ONLY. Do not apply until runtime, transfer and cutover approval gates pass.\n`
    + `begin;\nselect pg_advisory_xact_lock(7140261016);\n${preflight}\n${parts.join('\n\n')}\n${hardening}\ncommit;\n`;
  return { sql, sources };
}

async function main() {
  const { sql, sources } = await buildExistingProjectBaseline();
  const directory = path.join(projectRoot, '.deployment', `existing-project-baseline-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'candidate.sql'), sql, { flag: 'wx' });
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({
    version: 1, productionReady: false, executableByThisTool: false, sha256: sha256(sql), sources,
    ledgerTables: ['hoa_newsletter_runs', 'hoa_newsletter_deliveries'],
    backupRequirement: 'Waived by owner; existing recovery materials retained unchanged',
    blockers: ['Reviewed data/Auth transfer and legacy email-link compatibility', 'Remaining build-tool security review',
      'Retired chat access and effective grant review', 'Production configuration and Vercel verification'],
  }, null, 2), { flag: 'wx' });
  console.log(`Offline candidate prepared in ${path.relative(projectRoot, directory)}. No database was connected or changed. Not approved for production execution.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
