import { canManageAi, parseCookies, resolveAdmin } from '../../../lib/auth';
import { getDb } from '../../../lib/posts';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Model registry for Cloudflare Workers Free AI
export const CLOUDFLARE_FREE_MODELS = [
  {
    id: 'auto',
    name: 'Auto (Cursor Style Routing)',
    badge: 'Smart Auto',
    category: 'auto',
    description: 'Automatically analyzes your prompt intent and routes to the best model (Code -> Qwen 2.5 Coder 32B, Logic/Math -> DeepSeek R1, Complex/Agentic -> GLM-5.3-Flash, Fast Chat -> Llama 3.1 8B).'
  },
  {
    id: '@cf/qwen/qwen2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder 32B',
    badge: 'Best for Code',
    category: 'code',
    description: 'State-of-the-art coding powerhouse. Exceptional for TypeScript, Astro, SQL, debugging, and software architecture.'
  },
  {
    id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    name: 'DeepSeek R1 Distill Qwen 32B',
    badge: 'Reasoning & Math',
    category: 'reasoning',
    description: 'Deep chain-of-thought reasoning model. Best for intricate algorithm design, schema planning, and complex verification.'
  },
  {
    id: '@cf/zhipuai/glm-5.3-flash',
    name: 'GLM-5.3-Flash',
    badge: 'Next-Gen Agentic',
    category: 'general',
    description: 'Ultra-fast flagship GLM model with high benchmark scores for multi-step reasoning, agentic code synthesis, and structured outputs.'
  },
  {
    id: '@cf/zhipuai/glm-4.7-flash',
    name: 'GLM-4.7-Flash',
    badge: 'Fast & Capable',
    category: 'general',
    description: 'Lightweight GLM Flash engine with low latency for fast code refactoring, content drafting, and query generation.'
  },
  {
    id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    name: 'Llama 3.3 70B Instruct Fast',
    badge: '70B General',
    category: 'general',
    description: 'Massive 70B parameter model optimized by Cloudflare for deep general intelligence, technical writing, and synthesis.'
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct-fast',
    name: 'Llama 3.1 8B Instruct Fast',
    badge: 'Ultra Fast',
    category: 'general',
    description: 'Sub-second response latency. Perfect for quick queries, title generator, summaries, and instant edits.'
  }
];

export function routeAutoModel(prompt: string, systemPrompt?: string): { model: string; reason: string } {
  const combined = `${systemPrompt || ''} ${prompt}`.toLowerCase();

  const codeRegex = /\b(code|function|typescript|javascript|python|sql|schema|database|astro|component|css|html|api|endpoint|debug|refactor|error|stacktrace|class|interface|type|regex|git|bash|worker)\b/;
  const reasoningRegex = /\b(reason|think step-by-step|proof|calculate|algorithm|tradeoff|optimize complexity|architect|math|logic puzzle|formal verification)\b/;
  const agenticRegex = /\b(workflow|agent|pipeline|orchestrate|multi-step|glm|plan|autonomous|crawl|extract|research)\b/;

  if (reasoningRegex.test(combined)) {
    return {
      model: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      reason: 'Auto-routed to DeepSeek R1 Distill Qwen 32B (detected deep reasoning, algorithm, or analytical request).'
    };
  }

  if (codeRegex.test(combined)) {
    return {
      model: '@cf/qwen/qwen2.5-coder-32b-instruct',
      reason: 'Auto-routed to Qwen 2.5 Coder 32B (detected coding, debugging, or database query request).'
    };
  }

  if (agenticRegex.test(combined)) {
    return {
      model: '@cf/zhipuai/glm-5.3-flash',
      reason: 'Auto-routed to GLM-5.3-Flash (detected agentic workflow, pipeline, or synthesis request).'
    };
  }

  if (prompt.length > 250) {
    return {
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      reason: 'Auto-routed to Llama 3.3 70B Fast (longer context / detailed instructions).'
    };
  }

  return {
    model: '@cf/meta/llama-3.1-8b-instruct-fast',
    reason: 'Auto-routed to Llama 3.1 8B Fast (quick query / lowest latency).'
  };
}

export const POST: import('astro').APIRoute = async ({ locals, request }) => {
  const db = getDb(locals);
  if (!db) return json({ error: 'Database unavailable' }, 503);

  const cookies = parseCookies(request.headers.get('cookie'));
  const user = await resolveAdmin(db, request, cookies['examstatus_session']);
  if (!user || !canManageAi(user.role)) {
    return json({ error: 'Unauthorized: AI Studio requires admin or editor access.' }, 403);
  }

  const ai = locals.runtime?.env?.AI;
  if (!ai) {
    return json({
      error: 'Cloudflare AI binding (env.AI) is not available in the current environment.'
    }, 500);
  }

  const body = await request.json().catch(() => ({}));
  const requestedModel = String(body.model || 'auto').trim();
  const prompt = String(body.prompt || '').trim();
  const systemPrompt = String(body.system || '').trim();
  const temperature = Number.isFinite(body.temperature) ? Math.min(Math.max(Number(body.temperature), 0), 2) : 0.7;
  const maxTokens = Number.isFinite(body.max_tokens) ? Math.min(Math.max(Number(body.max_tokens), 128), 4096) : 2048;

  if (!prompt) {
    return json({ error: 'Prompt is required.' }, 400);
  }

  let finalModel = requestedModel;
  let routingReason = '';

  if (requestedModel === 'auto' || !requestedModel) {
    const routed = routeAutoModel(prompt, systemPrompt);
    finalModel = routed.model;
    routingReason = routed.reason;
  } else {
    routingReason = `Direct execution on selected model: ${finalModel}`;
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const startTime = Date.now();
  try {
    const aiResponse = await ai.run(finalModel as any, {
      messages,
      temperature,
      max_tokens: maxTokens
    });

    const latencyMs = Date.now() - startTime;
    let responseText = '';

    if (typeof aiResponse === 'string') {
      responseText = aiResponse;
    } else if (aiResponse && typeof (aiResponse as any).response === 'string') {
      responseText = (aiResponse as any).response;
    } else if (aiResponse && typeof (aiResponse as any).result === 'string') {
      responseText = (aiResponse as any).result;
    } else {
      responseText = JSON.stringify(aiResponse, null, 2);
    }

    return json({
      success: true,
      result: responseText,
      modelUsed: finalModel,
      requestedModel,
      reason: routingReason,
      latencyMs
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return json({
      success: false,
      error: err?.message || 'Error running Cloudflare AI model',
      modelUsed: finalModel,
      requestedModel,
      reason: routingReason,
      latencyMs
    }, 500);
  }
};
