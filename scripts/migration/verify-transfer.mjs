import { readFile, realpath, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { projectRoot } from '../member-hub/local.mjs';
import { legacySchema } from './fixtures/existing-project-schema.mjs';
import { buildExistingProjectBaseline } from './prepare-existing-project.mjs';
import { buildTransferPlan, transferTables } from './transfer-model.mjs';
import { buildTransferSql, subscriberColumns } from './transfer-sql.mjs';
import { destinationEnvironment, readDestination, sha256 } from './prepare-transfer.mjs';
import { readOnlyClient, rows } from './production-audit.mjs';

async function main() {
  const option = name => { const i = process.argv.indexOf(name); if (i < 0 || !process.argv[i + 1]) throw new Error(`Provide ${name}.`); return process.argv[i + 1]; };
  const root = await realpath(path.join(projectRoot, '.deployment'));
  const directory = await realpath(path.resolve(projectRoot, option('--bundle')));
  if (path.dirname(directory) !== root || !/^transfer-[0-9TZ-]+$/.test(path.basename(directory))) throw new Error('Expected private transfer package.');
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json')));
  const raw = await readFile(path.join(directory, 'source.json'));
  if (!manifest.complete || sha256(raw) !== manifest.sourceSha256) throw new Error('Invalid source checksum.');
  const source = JSON.parse(raw);
  const destination = await destinationEnvironment(option('--source-env'));
  if (destination.fingerprint !== manifest.projectFingerprint) throw new Error('Destination project changed.');
  const hosted = await readDestination(destination);
  const history = await rows(readOnlyClient(destination.origin, destination.key), 'newsletter_runs', 'id,sent_at');
  const actualPlan = buildTransferPlan(source, hosted.subscribers, hosted.users);
  // Missing identities exist ONLY in disposable PGlite, never in hosted Auth.
  const users = [...hosted.users, ...actualPlan.missingAccounts.map(account => ({
    id: randomUUID(), email: account.email, email_confirmed_at: new Date().toISOString(),
  }))];
  const plan = buildTransferPlan(source, hosted.subscribers, users);
  const sql = buildTransferSql(plan, hosted.subscribers, users);
  const db = new PGlite();
  try {
    await db.exec(legacySchema);
    await db.exec('delete from public.newsletter_subscribers; delete from public.newsletter_runs;');
    const columns = subscriberColumns.join(',');
    await db.query(`insert into public.newsletter_subscribers (${columns}) select ${columns}
      from jsonb_populate_recordset(null::public.newsletter_subscribers, $1::jsonb)`, [JSON.stringify(hosted.subscribers)]);
    await db.query('insert into public.newsletter_runs(id,sent_at) select id,sent_at from jsonb_populate_recordset(null::public.newsletter_runs, $1::jsonb)', [JSON.stringify(history)]);
    await db.exec((await buildExistingProjectBaseline()).sql);
    for (const user of users) await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,$3)', [user.id, user.email, user.email_confirmed_at || null]);
    for (const asset of source['public.hoa_assets']) await db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', [asset.bucket_id, asset.object_path]);
    await db.exec(sql);
    for (const table of transferTables) {
      const result = await db.query(`with actual as (select to_jsonb(t) as row from ${table} t),
        expected as (select to_jsonb(t) as row from jsonb_populate_recordset(null::${table}, $1::jsonb) t)
        select not exists ((select row from actual except select row from expected)
          union all (select row from expected except select row from actual)) as same`, [JSON.stringify(plan.tables[table])]);
      if (!result.rows[0].same) throw new Error('Transferred row comparison failed.');
    }
    const retained = hosted.subscribers.filter(row => !plan.subscriberIdsToRemove.includes(row.id));
    const comparison = await db.query(`with actual as (select ${columns} from public.newsletter_subscribers where id = any($2::uuid[])),
      expected as (select ${columns} from jsonb_populate_recordset(null::public.newsletter_subscribers, $1::jsonb) t)
      select not exists ((select * from actual except select * from expected) union all (select * from expected except select * from actual)) as same`, [JSON.stringify(retained), retained.map(row => row.id)]);
    const historyCheck = await db.query(`with expected as (select id,sent_at from jsonb_populate_recordset(null::public.newsletter_runs, $1::jsonb))
      select not exists ((select id,sent_at from public.newsletter_runs except select * from expected)
      union all (select * from expected except select id,sent_at from public.newsletter_runs)) as same`, [JSON.stringify(history)]);
    if (!comparison.rows[0].same || !historyCheck.rows[0].same) throw new Error('Live newsletter preservation check failed.');
    const report = { complete: true, productionReady: false, hostedChanged: false, disposablePGliteOnly: true,
      simulatedIdentities: actualPlan.missingAccounts.length, exactTableComparisons: transferTables.length,
      content: plan.tables['public.hoa_content'].length, assets: plan.tables['public.hoa_assets'].length,
      preservedSubscribers: retained.length, preservedHistory: history.length, sourceSha256: manifest.sourceSha256,
      limitations: 'Database rows and mocked storage metadata only. Actual file verification is a separate uploader check; simulated identities do not satisfy production account gates.' };
    await writeFile(path.join(directory, `sql-rehearsal-${Date.now()}.json`), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(report, null, 2));
  } finally { await db.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Disposable transfer verification failed. No hosted writes were attempted. Review account, consent and source expectations.'); process.exitCode = 1; });
}
