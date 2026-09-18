import { supabaseAdmin } from "./supabase";
import {
  AGENT_CONFIG,
  type AgentStage,
  type CriterionKey,
} from "@/src/config/agent";
import {
  calculateScore,
  type ExtractedCriteria,
} from "./score";

export async function createLead(data?: {
  source?: string | null;
  campaign?: string | null;
  adId?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  userAgent?: string | null;
  landingUrl?: string | null;
}) {
  const supabase = supabaseAdmin();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      source: data?.source ?? null,
      campaign: data?.campaign ?? null,
      ad_id: data?.adId ?? null,
      fbclid: data?.fbclid ?? null,
      meta_fbc: data?.fbc ?? null,
      meta_fbp: data?.fbp ?? null,
      user_agent: data?.userAgent ?? null,
      landing_url: data?.landingUrl ?? null,
      stage: "NEW",
      score: 0,
    })
    .select("*")
    .single();

  if (error) throw error;

  return lead;
}

export async function getLeadById(id: string) {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getLeadByTelegramId(
  telegramUserId: string
) {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function attachTelegramUser(
  leadId: string,
  telegram: {
    telegramUserId: string;
    firstName?: string | null;
    username?: string | null;
  }
) {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .update({
      telegram_user_id: telegram.telegramUserId,
      first_name: telegram.firstName ?? null,
      username: telegram.username ?? null,
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function updateLead(
  leadId: string,
  values: Record<string, unknown>
) {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function recordMessage(params: {
  leadId: string;
  role: "user" | "assistant";
  content: string;
  telegramMessageId?: number | null;
}) {
  const { error } = await supabaseAdmin()
    .from("messages")
    .insert({
      lead_id: params.leadId,
      role: params.role,
      content: params.content,
      telegram_message_id:
        params.telegramMessageId ?? null,
    });

  if (error) throw error;
}

export async function getRecentMessages(
  leadId: string,
  limit = 14
) {
  const { data, error } = await supabaseAdmin()
    .from("messages")
    .select("role, content, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return [...(data ?? [])].reverse();
}

export async function updateCriteria(
  leadId: string,
  criteria: ExtractedCriteria
) {
  const entries = Object.entries(criteria);

  if (!entries.length) {
    return;
  }

  const rows = entries
    .filter(([key]) =>
      AGENT_CONFIG.criteria.some(
        (criterion) => criterion.key === key
      )
    )
    .map(([key, item]) => ({
      lead_id: leadId,
      criterion_key: key,
      value: Math.max(0, Math.min(1, Number(item?.value ?? 0))),
      evidence: String(item?.evidence ?? ""),
      updated_at: new Date().toISOString(),
    }));

  if (!rows.length) return;

  const { error } = await supabaseAdmin()
    .from("lead_criteria")
    .upsert(rows, {
      onConflict: "lead_id,criterion_key",
    });

  if (error) throw error;
}

export async function setCriterion(
  leadId: string,
  key: CriterionKey,
  value: number,
  evidence: string
) {
  await updateCriteria(leadId, {
    [key]: {
      value,
      evidence,
    },
  });
}

export async function recalculateLeadScore(
  leadId: string
) {
  const { data, error } = await supabaseAdmin()
    .from("lead_criteria")
    .select("criterion_key, value")
    .eq("lead_id", leadId);

  if (error) throw error;

  const score = calculateScore(data ?? []);

  const lead = await updateLead(leadId, {
    score,
  });

  return lead;
}

export async function incrementCounter(
  leadId: string,
  field:
    | "pre_free_turns"
    | "post_free_turns"
) {
  const lead = await getLeadById(leadId);

  if (!lead) throw new Error("Lead not found.");

  const current = Number(lead[field] ?? 0);

  return updateLead(leadId, {
    [field]: current + 1,
  });
}

export async function shouldShowVipOffer(
  lead: any
) {
  if (!lead) return false;

  if (lead.paid) return false;

  if (lead.vip_offer_shown) {
    if (!lead.vip_offer_shown_at) return false;

    const elapsed =
      Date.now() -
      new Date(lead.vip_offer_shown_at).getTime();

    const cooldown =
      AGENT_CONFIG.funnel.offerCooldownHours *
      60 *
      60 *
      1000;

    if (elapsed < cooldown) return false;
  }

  if (!lead.free_channel_joined) return false;

  if (
    Number(lead.post_free_turns ?? 0) <
    AGENT_CONFIG.funnel.minimumPostFreeUserReplies
  ) {
    return false;
  }

  return Number(lead.score ?? 0) >=
    AGENT_CONFIG.funnel.vipThreshold;
}

export async function recordVipOfferShown(
  leadId: string
) {
  return updateLead(leadId, {
    vip_offer_shown: true,
    vip_offer_shown_at: new Date().toISOString(),
    stage: "VIP_OFFERED",
  });
}
