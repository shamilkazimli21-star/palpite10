import { z } from "zod";

const schema = z.object({
  APP_URL: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  TELEGRAM_FREE_CHANNEL_ID: z.string().min(1),
  TELEGRAM_FREE_CHANNEL_URL: z.string().url(),
  TELEGRAM_VIP_CHANNEL_URL: z.string().url().optional().or(z.literal("")),

  DEEPSEEK_API_KEY: z.string().min(1),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),

  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_WEBHOOK_SECRET: z.string().min(1),
  WHOP_COMPANY_ID: z.string().optional(),
  WHOP_PLAN_WEEKLY: z.string().min(1),
  WHOP_PLAN_MONTHLY: z.string().min(1),
  WHOP_PLAN_3_MONTHS: z.string().min(1),
  WHOP_SANDBOX: z.string().default("false"),

  META_PIXEL_ID: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_GRAPH_API_VERSION: z.string().optional(),
  META_TEST_EVENT_CODE: z.string().optional(),

  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().min(1),
});

export function getEnv() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Environment variables are not configured correctly.");
  }

  return parsed.data;
}

export function getSupabaseSecretKey() {
  const env = getEnv();

  const key =
    env.SUPABASE_SECRET_KEY ??
    env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY is missing. Add the new Supabase secret key in Vercel."
    );
  }

  return key;
}
