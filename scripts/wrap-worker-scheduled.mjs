import fs from 'node:fs';
import path from 'node:path';

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
  const secret = env.AI_CRON_SECRET;
  if (!secret) return;
  const base = env.PUBLIC_SITE_URL || 'https://examstatus.skmstudio-services.workers.dev';
  const req = new Request(base + '/api/cron/research', {
    method: 'POST',
    headers: { 'x-cron-secret': secret }
  });
  ctx.waitUntil((__orig.default?.fetch ?? __orig.default)(req, env, ctx));
}
`;

if (code.includes('export {') && code.includes('as default')) {
  code = scheduledSnippet + code.replace(
    /export\s*\{([^}]+)\}\s*;?\s*$/,
    `const __orig = { $1 };
export default {
  fetch: __orig.default?.fetch ?? __orig.default,
  scheduled: __examstatus_scheduled
};`
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
console.log('[wrap-worker-scheduled] patched scheduled handler');
