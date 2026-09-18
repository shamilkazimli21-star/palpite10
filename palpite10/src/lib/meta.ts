import { getEnv, metaEnabled } from "./env";
import { sha256 } from "./util";
import type { Lead } from "./leads";

type MetaEventInput = {
  name: string;
  actionSource: "website" | "chat";
  /** Same ID as the browser pixel event when both fire → Meta deduplicates. */
  eventId: string;
  lead: Pick<
    Lead,
    "id" | "visitor_id" | "meta_fbc" | "meta_fbp" | "fbclid" | "client_ip" | "user_agent" | "landing_url" | "created_at"
  >;
  email?: string | null;
  value?: number;
  currency?: string;
  contentName?: string;
  contentId?: string;
  customData?: Record<string, unknown>;
};

function buildFbc(lead: MetaEventInput["lead"]): string | undefined {
  if (lead.meta_fbc) return lead.meta_fbc;
  if (!lead.fbclid) return undefined;
  // Meta's documented format when the cookie is absent: fb.1.<click time ms>.<fbclid>
  return `fb.1.${new Date(lead.created_at).getTime()}.${lead.fbclid}`;
}

/**
 * Never throws: analytics must not be able to break a sale.
 */
export async function sendMetaEvent(input: MetaEventInput): Promise<boolean> {
  try {
    if (!metaEnabled()) return false;
    const env = getEnv();

    const userData: Record<string, unknown> = {
      // Same value the browser pixel gets through advanced matching (it hashes it itself).
      external_id: [sha256(input.lead.visitor_id ?? input.lead.id)],
    };
    const fbc = buildFbc(input.lead);
    if (fbc) userData.fbc = fbc;
    if (input.lead.meta_fbp) userData.fbp = input.lead.meta_fbp;
    if (input.lead.client_ip) userData.client_ip_address = input.lead.client_ip;
    if (input.lead.user_agent) userData.client_user_agent = input.lead.user_agent;
    if (input.email) userData.em = [sha256(input.email.trim().toLowerCase())];

    const event: Record<string, unknown> = {
      event_name: input.name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      action_source: input.actionSource,
      user_data: userData,
    };
    if (input.actionSource === "website") {
      event.event_source_url = input.lead.landing_url ?? env.APP_URL;
    }

    const custom: Record<string, unknown> = { ...(input.customData ?? {}) };
    if (typeof input.value === "number") {
      custom.value = Number(input.value.toFixed(2));
      custom.currency = input.currency ?? "BRL";
    }
    if (input.contentName) custom.content_name = input.contentName;
    if (input.contentId) {
      custom.content_ids = [input.contentId];
      custom.content_type = "product";
    }
    if (Object.keys(custom).length) event.custom_data = custom;

    const payload: Record<string, unknown> = { data: [event] };
    if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(
        `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(
          env.META_ACCESS_TOKEN!,
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        console.error("[meta]", input.name, response.status, (await response.text()).slice(0, 300));
        return false;
      }
      return true;
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("[meta]", input.name, error);
    return false;
  }
}
