/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type D1Database = import('@cloudflare/workers-types').D1Database;

type AiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<any>;
};

type ENV = {
  DB: D1Database;
  AI?: AiBinding;
  ADMIN_SESSION_SECRET?: string;
  AI_CRON_SECRET?: string;
};

type Runtime = import('@astrojs/cloudflare').Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {}
}
