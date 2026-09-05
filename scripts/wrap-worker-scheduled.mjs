import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const workerPath = path.join(process.cwd(), 'dist', '_worker.js', 'index.js');
if (!fs.existsSync(workerPath)) {
  console.warn('[wrap-worker-scheduled] dist worker not found, skipping');
  process.exit(0);
}

let code = fs.readFileSync(workerPath, 'utf8');

if (code.includes('__examstatus_scheduled')) {
  console.log('[wrap-worker-scheduled] already patched');
  process.exit(0);
}

const scheduledSnippet = `
async function __examstatus_scheduled(controller, env, ctx) {
  const headers = { 'x-internal-cron': '1' };
  if (env.AI_CRON_SECRET) headers['x-cron-secret'] = env.AI_CRON_SECRET;
  const req = new Request('http://localhost/api/cron/research', {
    method: 'POST',
    headers
  });
  ctx.waitUntil(__astrojsSsrVirtualEntry.fetch(req, env, ctx));
}
`;

const astroNamedExport =
  /export\s*\{\s*__astrojsSsrVirtualEntry\s+as\s+default(?:\s*,\s*(\w+))?\s*\}\s*;?\s*$/m;

const astroMatch = code.match(astroNamedExport);
if (astroMatch) {
  const extra = astroMatch[1];
  const extraExport = extra ? `\nexport { ${extra} };` : '';
  code =
    scheduledSnippet +
    code.replace(
      astroNamedExport,
      `export default {
  fetch: __astrojsSsrVirtualEntry.fetch.bind(__astrojsSsrVirtualEntry),
  scheduled: __examstatus_scheduled
};${extraExport}`
    );
} else if (code.includes('export default')) {
  code =
    scheduledSnippet +
    code.replace(/export default\s+(\w+)\s*;?/m, 'const __origWorker = $1;') +
    `\nexport default {
  fetch: __origWorker.fetch.bind(__origWorker),
  scheduled: __examstatus_scheduled
};`;
} else {
  console.warn('[wrap-worker-scheduled] unknown worker format, skipping patch');
  process.exit(0);
}

fs.writeFileSync(workerPath, code);

try {
  execSync(`node --check "${workerPath}"`, { stdio: 'pipe' });
  console.log('[wrap-worker-scheduled] patched scheduled handler (syntax ok)');
} catch (e) {
  console.error('[wrap-worker-scheduled] patched file failed syntax check');
  process.exit(1);
}
