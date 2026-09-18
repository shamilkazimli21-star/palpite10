import { z } from "zod";
import { deepseekJson, type ChatMessage } from "../lib/deepseek";
import type { Lead, Profile, StoredMessage } from "../lib/leads";
import { FUNNEL, type Stage } from "../config/funnel";
import { FOLLOWUP_PROMPT, STAGE_INSTRUCTIONS, salesAgentStaticPrompt } from "../config/prompts";
import { renderPlaybook, type Playbook } from "../learning/playbook";
import type { Assignment } from "../learning/experiments";
import { TEXTS } from "../config/texts";
import { findForbiddenClaims, ensureResultsDisclaimer } from "./guardrails";
import { hoursSince } from "../lib/util";

/* ------------------------------------------------------------------ */
/*  Output contract                                                   */
/* ------------------------------------------------------------------ */

const NEXT_ACTIONS = ["none", "invite_free", "offer_vip", "show_plans", "handoff_human", "stop_selling"] as const;
export type NextAction = (typeof NEXT_ACTIONS)[number];

const stringList = z.array(z.string()).catch([]);

const outputSchema = z.object({
  messages: z
    .array(z.string())
    .catch([])
    .transform((list) => list.map((m) => m.trim()).filter(Boolean).slice(0, 2)),
  intent: z.string().catch("neutral"),
  next_action: z.enum(NEXT_ACTIONS).catch("none"),
  signals: z
    .record(z.string(), z.object({ value: z.coerce.number().catch(0), evidence: z.string().catch("") }))
    .catch({}),
  objection: z.enum(["price", "trust", "value", "timing", "results", "other"]).nullable().catch(null),
  profile_update: z
    .object({
      favorite_team: z.string().nullable().catch(null),
      leagues: stringList,
      prediction_usage: z.string().nullable().catch(null),
      wants: stringList,
      pain_points: stringList,
      style: z.string().nullable().catch(null),
      notes: z.string().nullable().catch(null),
    })
    .partial()
    .catch({}),
  risk_flag: z.enum(["underage", "gambling_harm"]).nullable().catch(null),
});

export type AgentOutput = z.infer<typeof outputSchema> & { guardrailHits: string[] };

/* ------------------------------------------------------------------ */
/*  Permissions the backend grants for THIS turn                       */
/* ------------------------------------------------------------------ */

export type Permissions = {
  inviteAllowed: boolean;
  inviteDue: boolean;
  offerAllowed: boolean;
  offerDue: boolean;
  plansAllowed: boolean;
};

export function stageOf(lead: Lead): Stage {
  if (lead.vip_active) return "PAID";
  if (lead.stage === "NOT_INTERESTED") return "NOT_INTERESTED";
  if (lead.checkout_started) return "CHECKOUT";
  if (lead.vip_offer_count > 0) return "VIP_OFFERED";
  if (lead.free_channel_joined) return "ENGAGED";
  if (lead.free_channel_invited) return "FREE_INVITED";
  if (lead.user_turns > 0) return "DISCOVERY";
  return "NEW";
}

export function permissionsFor(lead: Lead): Permissions {
  const blockedFromSales = lead.do_not_sell || lead.vip_active;
  const notInterested = lead.stage === "NOT_INTERESTED";

  const inviteAllowed = !lead.do_not_sell && !lead.free_channel_joined && lead.pre_free_turns >= FUNNEL.minRepliesBeforeFreeInvite;
  const inviteDue = inviteAllowed && !lead.free_channel_invited && lead.pre_free_turns >= FUNNEL.forceFreeInviteAfterReplies;

  const cooledDown = hoursSince(lead.vip_offer_last_at) >= FUNNEL.offerCooldownHours;
  const offerAllowed =
    !blockedFromSales &&
    !notInterested &&
    lead.free_channel_joined &&
    lead.post_free_turns >= FUNNEL.minRepliesAfterJoinBeforeOffer &&
    lead.score >= FUNNEL.vipScoreThreshold &&
    lead.vip_offer_count < FUNNEL.maxProactiveOffers &&
    cooledDown;

  return {
    inviteAllowed,
    inviteDue,
    offerAllowed,
    offerDue: offerAllowed && lead.eligible_turns >= FUNNEL.offerDueAfterEligibleTurns,
    plansAllowed: !blockedFromSales && FUNNEL.alwaysAnswerDirectBuyingQuestions,
  };
}

/* ------------------------------------------------------------------ */
/*  Prompt assembly                                                   */
/* ------------------------------------------------------------------ */

const yes = (b: boolean) => (b ? "SIM" : "NÃO");

function renderState(lead: Lead, stage: Stage, p: Permissions): string {
  const now = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());
  return [
    "# ESTADO (definido pelo sistema — obedeça)",
    `Agora (Brasília): ${now}`,
    `Primeiro nome: ${lead.first_name ?? "desconhecido"}`,
    `Já está no canal gratuito: ${yes(lead.free_channel_joined)}`,
    `Convite para o canal já enviado: ${yes(lead.free_channel_invited)}`,
    `Pode usar "invite_free" agora: ${yes(p.inviteAllowed || (lead.free_channel_invited && !lead.free_channel_joined))}${
      p.inviteDue ? " — FAÇA O CONVITE NESTA MENSAGEM, de forma natural." : ""
    }`,
    `Pode usar "offer_vip" (iniciativa sua) agora: ${yes(p.offerAllowed)}${
      p.offerDue ? " — este é um bom momento: faça a ponte para o VIP nesta mensagem, a menos que a pessoa tenha acabado de dizer algo que torne isso inadequado." : ""
    }`,
    `Pode usar "show_plans" se a pessoa PERGUNTAR de VIP/preço/como assinar: ${yes(p.plansAllowed)}`,
    `VIP já apresentado: ${lead.vip_offer_count} vez(es)${lead.vip_offer_last_at ? `, última há ${Math.round(hoursSince(lead.vip_offer_last_at))}h` : ""}`,
    `Abriu o pagamento: ${yes(lead.checkout_started)}${lead.last_checkout_plan ? ` (plano: ${lead.last_checkout_plan})` : ""}`,
    `É cliente VIP ativo: ${yes(lead.vip_active)}`,
    lead.do_not_sell ? `⚠️ NÃO VENDER para esta pessoa (${lead.do_not_sell_reason}). Seja apenas educado e cuidadoso.` : "",
    "",
    STAGE_INSTRUCTIONS[stage],
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function renderProfile(profile: Profile | null): string {
  if (!profile) return "# PERFIL\n(nada conhecido ainda)";
  const parts = [
    profile.favorite_team && `Time: ${profile.favorite_team}`,
    profile.leagues?.length && `Campeonatos: ${profile.leagues.join(", ")}`,
    profile.prediction_usage && `Como usa palpites: ${profile.prediction_usage}`,
    profile.wants?.length && `O que procura: ${profile.wants.join("; ")}`,
    profile.pain_points?.length && `Dores: ${profile.pain_points.join("; ")}`,
    profile.objections?.length && `Objeções já levantadas: ${profile.objections.join(", ")}`,
    profile.style && `Jeito de escrever: ${profile.style}`,
    profile.notes && `Notas: ${profile.notes}`,
  ].filter(Boolean);
  return `# PERFIL (memória desta pessoa — use, não repita perguntas)\n${parts.length ? parts.join("\n") : "(nada conhecido ainda)"}`;
}

/** Stored history → chat messages. System events become bracketed user-side notes; same-role neighbours are merged. */
function toChatHistory(history: StoredMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of history) {
    const role: "user" | "assistant" = m.role === "assistant" ? "assistant" : "user";
    const content = m.role === "event" ? `[EVENTO DO SISTEMA — não é fala da pessoa] ${m.content}` : m.content;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else out.push({ role, content });
  }
  if (out[0]?.role === "assistant") out.unshift({ role: "user", content: "[EVENTO DO SISTEMA — não é fala da pessoa] (início da conversa omitido)" });
  return out;
}

export type AgentInput = {
  lead: Lead;
  profile: Profile | null;
  history: StoredMessage[];
  playbook: Playbook;
  experiments: Assignment[];
  permissions: Permissions;
  stage: Stage;
  /** Extra instruction for system-triggered turns and follow-ups (pt-BR or English). */
  directive?: string;
  followupMode?: boolean;
};

function buildMessages(input: AgentInput, correction?: string): ChatMessage[] {
  const dynamic = [
    renderPlaybook(input.playbook, input.stage),
    input.experiments.length
      ? "# TESTE A/B ATIVO (siga quando a situação se aplicar)\n" + input.experiments.map((e) => `- [${e.slot}] ${e.instruction}`).join("\n")
      : "",
    renderProfile(input.profile),
    renderState(input.lead, input.stage, input.permissions),
    input.followupMode ? FOLLOWUP_PROMPT : "",
    input.directive ? `# INSTRUÇÃO PARA ESTA MENSAGEM\n${input.directive}` : "",
    correction ? `# CORREÇÃO OBRIGATÓRIA\n${correction}` : "",
    "Responda somente com o objeto json.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const history = toChatHistory(input.history);
  if (!history.length || history[history.length - 1]!.role !== "user") {
    history.push({ role: "user", content: "[EVENTO DO SISTEMA — não é fala da pessoa] Escreva a próxima mensagem conforme a instrução." });
  }

  return [
    // Static block first → identical prefix on every call → DeepSeek prompt-cache hits.
    { role: "system", content: salesAgentStaticPrompt() },
    { role: "system", content: dynamic },
    ...history,
  ];
}

/* ------------------------------------------------------------------ */
/*  Run                                                               */
/* ------------------------------------------------------------------ */

export async function runSalesAgent(input: AgentInput): Promise<AgentOutput> {
  let correction: string | undefined;
  let hits: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const { json } = await deepseekJson({
      messages: buildMessages(input, correction),
      temperature: input.followupMode ? 0.8 : 0.7,
      maxTokens: 900,
      thinking: false,
      timeoutMs: 35_000,
      retries: 1,
      label: "sales-agent",
    });

    const parsed = outputSchema.parse(json ?? {});
    // Some models answer {"reply": "..."} despite instructions — salvage it.
    if (!parsed.messages.length) {
      const reply = (json as { reply?: unknown } | null)?.reply;
      if (typeof reply === "string" && reply.trim()) parsed.messages = [reply.trim()];
    }
    if (!parsed.messages.length) {
      correction = 'O campo "messages" veio vazio. Escreva a resposta para a pessoa em "messages".';
      continue;
    }
    parsed.messages = parsed.messages.map((m) => (m.length > 600 ? m.slice(0, 597) + "…" : m));

    hits = findForbiddenClaims(parsed.messages.join("\n"));
    if (!hits.length) return { ...parsed, messages: ensureResultsDisclaimer(parsed.messages), guardrailHits: [] };

    correction = `Sua resposta anterior violou regras (${hits.join(", ")}): "${parsed.messages.join(" ")}". Reescreva sem promessas, sem números inventados, sem urgência, sem links.`;
    if (attempt === 1) {
      // Still unsafe after a correction → send something harmless and flag it for the owner.
      return { ...parsed, messages: [TEXTS.safeFallback], next_action: "handoff_human", guardrailHits: hits };
    }
  }
  return {
    messages: [TEXTS.safeFallback],
    intent: "neutral",
    next_action: "none",
    signals: {},
    objection: null,
    profile_update: {},
    risk_flag: null,
    guardrailHits: hits,
  };
}
