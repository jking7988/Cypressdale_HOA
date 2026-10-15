import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getLocalStatus, projectRoot } from './local.mjs';

const status = getLocalStatus();
const environment = { ...process.env,
  MEMBER_HUB_ENABLED: 'true', MEMBER_HUB_ENVIRONMENT: 'local',
  MEMBER_HUB_SUPABASE_URL: status.API_URL, MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
  MEMBER_HUB_SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, MEMBER_HUB_SITE_URL: 'http://localhost:3001',
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
};
for (const key of ['RESEND_API_KEY']) delete environment[key];
const cli = fileURLToPath(new URL('../../node_modules/next/dist/bin/next', import.meta.url));
const child = spawn(process.execPath, [cli, 'dev', '--hostname', '127.0.0.1', '--port', '3001'], {
  cwd: projectRoot, env: environment, stdio: 'inherit',
});
child.on('exit', code => { process.exitCode = code ?? 0; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
