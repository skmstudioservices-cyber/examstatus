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

// Lazy fetch wrapper — resolves the original worker's fetch on first call,
// not at module load time. This avoids 'Cannot read properties of undefined'
// during Workers deploy validation when __astrojsSsrVirtualEntry isn't
// initialized yet at the point where our prepended code runs.
const scheduledSnippet = `
var __examstatusOrigExport;
function __examstatusGetFetch() {
  if (!__examstatusOrigExport) {
    if (typeof __astrojsSsrVirtualEntry !== 'undefined') {
      __examstatusOrigExport = __astrojsSsrVirtualEntry;
    } else if (typeof _default !== 'undefined') {
      __examstatusOrigExport = _default;
    } else {
      // Fallback: search global scope
      try { __examstatusOrigExport = globalThis.__astroWorker; } catch(e) {}
    }
  }
  if (__examstatusOrigExport && typeof __examstatusOrigExport.fetch === 'function') {
    return __examstatusOrigExport.fetch.bind(__examstatusOrigExport);
  }
  // If we still can't find it, return a passthrough
  return function(request, env, ctx) {
    return new Response('Worker fetch not yet initialized', { status: 503 });
  };
}

async function __examstatus_scheduled(controller, env, ctx) {
  const base = 'http://localhost';
  const headers = { 'x-internal-cron': '1' };
  if (env.AI_CRON_SECRET) headers['x-cron-secret'] = env.AI_CRON_SECRET;

  const doFetch = __examstatusGetFetch();

  // Run research (discovers new exams, updates existing)
  const researchReq = new Request(base + '/api/cron/research', {
    method: 'POST',
    headers
  });
  ctx.waitUntil(doFetch(researchReq, env, ctx));

  // Run audit (self-review of pages for SEO/accessibility issues)
  const auditReq = new Request(base + '/api/cron/audit', {
    method: 'POST',
    headers
  });
  ctx.waitUntil(doFetch(auditReq, env, ctx));
}
`;

let patched = false;

// Pattern 1: Astro's named export format
// export { __astrojsSsrVirtualEntry as default };
const astroNamedExport =
  /export\s*\{\s*__astrojsSsrVirtualEntry\s+as\s+default(?:\s*,\s*(\w+))?\s*}\s*;?\s*$/m;

const astroMatch = code.match(astroNamedExport);
if (astroMatch) {
  const extra = astroMatch[1];
  const extraExport = extra ? `\nexport { ${extra} };` : '';

  code = scheduledSnippet + code.replace(
    astroNamedExport,
    `export default {
  fetch: function(request, env, ctx) { return __examstatusGetFetch()(request, env, ctx); },
  scheduled: __examstatus_scheduled
};${extraExport}`
  );
  patched = true;
}

// Pattern 2: Generic `export default SomeVar;`
if (!patched && code.includes('export default')) {
  const defaultMatch = code.match(/export\s+default\s+(\w+)\s*;?/m);
  if (defaultMatch) {
    const origName = defaultMatch[1];
    code = scheduledSnippet + code.replace(/export\s+default\s+\w+\s*;?/m, '') +
`\nexport default {
  fetch: function(request, env, ctx) {
    if (typeof ${origName} === 'function') return ${origName}(request, env, ctx);
    if (${origName} && typeof ${origName}.fetch === 'function') return ${origName}.fetch(request, env, ctx);
    return new Response('Worker not initialized', { status: 503 });
  },
  scheduled: __examstatus_scheduled
};`;
    patched = true;
  }
}

// Pattern 3: Inline object — `const X = { fetch: ... }` then `export default X`
if (!patched) {
  const fetchObjMatch = code.match(/(?:const|var|let)\s+(\w+)\s*=\s*\{\s*fetch\s*:/m);
  if (fetchObjMatch) {
    const objName = fetchObjMatch[1];
    code = scheduledSnippet + code +
`\nexport default {
  fetch: function(request, env, ctx) { return ${objName}.fetch(request, env, ctx); },
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
