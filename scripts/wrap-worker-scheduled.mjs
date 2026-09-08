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

// Call both research and audit endpoints on each scheduled trigger
const scheduledSnippet = `
async function __examstatus_scheduled(controller, env, ctx) {
  const base = 'http://localhost';
  const headers = { 'x-internal-cron': '1' };
  if (env.AI_CRON_SECRET) headers['x-cron-secret'] = env.AI_CRON_SECRET;

  // Run research (discovers new exams, updates existing)
  const researchReq = new Request(base + '/api/cron/research', {
    method: 'POST',
    headers
  });
  ctx.waitUntil(__examstatusWorkerFetch(researchReq, env, ctx));

  // Run audit (self-review of pages for SEO/accessibility issues)
  const auditReq = new Request(base + '/api/cron/audit', {
    method: 'POST',
    headers
  });
  ctx.waitUntil(__examstatusWorkerFetch(auditReq, env, ctx));
}
`;

let patched = false;

// Pattern 1: Astro's named export format
const astroNamedExport =
  /export\s*\{\s*__astrojsSsrVirtualEntry\s+as\s+default(?:\s*,\s*(\w+))?\s*}\s*;?\s*$/m;

const astroMatch = code.match(astroNamedExport);
if (astroMatch) {
  const extra = astroMatch[1];
  const extraExport = extra ? `\nexport { ${extra} };` : '';

  // Create a reference to the original worker's fetch
  code = `
const __examstatusWorkerFetch = __astrojsSsrVirtualEntry.fetch.bind(__astrojsSsrVirtualEntry);
` + scheduledSnippet + code.replace(
    astroNamedExport,
    `export default {
  fetch: __examstatusWorkerFetch,
  scheduled: __examstatus_scheduled
};${extraExport}`
  );
  patched = true;
}

// Pattern 2: Generic export default
if (!patched && code.includes('export default')) {
  const defaultMatch = code.match(/export\s+default\s+(\w+)\s*;?/m);
  if (defaultMatch) {
    const origName = defaultMatch[1];
    code = `
const __examstatusWorkerFetch = typeof ${origName}.fetch === 'function' ? ${origName}.fetch.bind(${origName}) : ${origName};
` + scheduledSnippet + code.replace(/export default\s+\w+\s*;?/m, '') +
`
export default {
  fetch: __examstatusWorkerFetch,
  scheduled: __examstatus_scheduled
};`;
    patched = true;
  }
}

// Pattern 3: Try to find any object with a .fetch method and wrap it
if (!patched) {
  // Look for patterns like: var X = { fetch: ... } or const X = { fetch: ... }
  const fetchObjMatch = code.match(/(?:const|var|let)\s+(\w+)\s*=\s*\{\s*fetch\s*:/m);
  if (fetchObjMatch) {
    const objName = fetchObjMatch[1];
    code = `
const __examstatusWorkerFetch = ${objName}.fetch.bind(${objName});
` + scheduledSnippet + code +
`
export default {
  fetch: __examstatusWorkerFetch,
  scheduled: __examstatus_scheduled
};`;
    patched = true;
  }
}

if (!patched) {
  console.warn('[wrap-worker-scheduled] could not patch worker — unknown output format');
  console.warn('[wrap-worker-scheduled] first 500 chars of worker file:');
  console.warn(code.slice(0, 500));
  process.exit(0);
}

fs.writeFileSync(workerPath, code);

try {
  execSync(`node --check "${workerPath}"`, { stdio: 'pipe' });
  console.log('[wrap-worker-scheduled] patched scheduled handler (syntax ok)');
} catch (e) {
  console.error('[wrap-worker-scheduled] patched file failed syntax check');
  console.error(e.stderr?.toString() || e.message);
  process.exit(1);
}
