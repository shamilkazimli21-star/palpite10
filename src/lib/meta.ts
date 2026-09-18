import crypto from "crypto";
import { getEnv } from "./env";

function sha256(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

export async function sendMetaEvent(params: {
  eventName: string;
  eventId: string;
  lead: any;
  value?: number;
  currency?: string;
  contentName?: string;
  contentId?: string;
}) {
  const env = getEnv();

  if (
    !env.META_PIXEL_ID ||
    !env.META_ACCESS_TOKEN ||
    !env.META_GRAPH_API_VERSION
  ) {
    console.warn(
      "[Meta] CAPI not configured. Skipping event."
    );

    return null;
  }

  const userData: Record<string, unknown> = {};

  if (params.lead.meta_fbc) {
    userData.fbc = params.lead.meta_fbc;
  }

  if (params.lead.meta_fbp) {
    userData.fbp = params.lead.meta_fbp;
  }

  if (params.lead.telegram_user_id) {
    userData.external_id = [
      sha256(
        String(params.lead.telegram_user_id)
      ),
    ];
  }

  if (params.lead.user_agent) {
    userData.client_user_agent =
      params.lead.user_agent;
  }

  const event: Record<string, unknown> = {
    event_name: params.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    action_source: "website",
    user_data: userData,
  };

  if (params.lead.landing_url) {
    event.event_source_url =
      params.lead.landing_url;
  }

  if (
    typeof params.value === "number" &&
    params.eventName === "Purchase"
  ) {
    event.custom_data = {
      value: params.value,
      currency: params.currency ?? "BRL",
      content_name:
        params.contentName ?? "PALPITE10 VIP",
      content_type: "product",
      content_ids: params.contentId
        ? [params.contentId]
        : undefined,
    };
  }

  const payload: Record<string, unknown> = {
    data: [event],
  };

  if (env.META_TEST_EVENT_CODE) {
    payload.test_event_code =
      env.META_TEST_EVENT_CODE;
  }

  const endpoint =
    `https://graph.facebook.com/` +
    `${env.META_GRAPH_API_VERSION}/` +
    `${env.META_PIXEL_ID}/events` +
    `?access_token=${encodeURIComponent(
      env.META_ACCESS_TOKEN
    )}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error(
      "[Meta CAPI] Failed:",
      result
    );

    return null;
  }

  console.log(
    "[Meta CAPI] Event sent:",
    params.eventName,
    result
  );

  return result;
}
