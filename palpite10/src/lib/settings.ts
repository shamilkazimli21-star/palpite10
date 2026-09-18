import { z } from "zod";
import { BUSINESS } from "../config/business";
import { FOLLOWUPS, FOLLOWUP_RULES, FUNNEL, LEARNING, RETENTION, SIGNALS, SUPPORT } from "../config/funnel";
import { lockedPromptPart, PROMPT_BLOCKS, salesAgentStaticPrompt, STAGE_INSTRUCTIONS, SUPPORT_KB, type KnowledgeEntry, type PromptBlockKey } from "../config/prompts";
import { findForbiddenClaims } from "../sales/guardrails";
import { db } from "./supabase";

/**
 * OWNER SETTINGS
 * --------------
 * The files in src/config are the DEFAULTS. Whatever the owner saves in the
 * admin panel (/admin) is stored in Supabase (`app_state`, key "settings")
 * and applied ON TOP of those defaults here, at runtime — no redeploy needed.
 *
 * Every request entry point calls `await loadSettings()`; the result is cached
 * for 20 seconds per server instance, so a change is live everywhere in < 30s.
 */

const clone = <T>(v: T): T => structuredClone(v);
type Dict<T = unknown> = Record<string, T>;

/* ------------------------------------------------------------------ */
/*  What may be changed, and within which limits                       */
/* ------------------------------------------------------------------ */

export const RULE_SPECS = {
  funnel: {
    minRepliesBeforeFreeInvite: [0, 10],
    forceFreeInviteAfterReplies: [1, 20],
    minRepliesAfterJoinBeforeOffer: [0, 10],
    vipScoreThreshold: [0, 100],
    offerDueAfterEligibleTurns: [0, 10],
    maxProactiveOffers: [0, 5],
    offerCooldownHours: [1, 720],
    closeAsLostAfterSilentDays: [2, 60],
    historyMessages: [8, 60],
  },
  followups: { maxPerLeadTotal: [0, 12], maxSinceLastReply: [0, 4], sendFromHour: [0, 23], sendUntilHour: [1, 24], maxPerRun: [1, 200] },
  learning: { coachBatchSize: [3, 100], defaultMinSamplePerVariant: [10, 1000] },
  retention: { messageDays: [7, 365], eventDays: [7, 365] },
  support: { autoReleaseHours: [1, 72] },
} as const satisfies Dict<Dict<readonly [number, number]>>;

type RuleGroup = keyof typeof RULE_SPECS;
const RULE_TARGETS: Record<RuleGroup, Dict<number>> = {
  funnel: FUNNEL as unknown as Dict<number>,
  followups: FOLLOWUPS as unknown as Dict<number>,
  learning: LEARNING as unknown as Dict<number>,
  retention: RETENTION as unknown as Dict<number>,
  support: SUPPORT as unknown as Dict<number>,
};
const signalRows = SIGNALS as unknown as { key: string; weight: number; source: string; description: string }[];
const allFollowupRules = () => Object.values(FOLLOWUP_RULES).flat();

const str = (max: number) => z.string().trim().max(max);
const nstr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));
const list = (max: number, n: number) => z.array(str(max).min(1)).max(n);
const count = z.number().int().min(0).max(100000);

const businessSchema = z.object({
  brand: str(40).min(1),
  minimumAge: z.number().int().min(18).max(25),
  freeChannel: z.object({ name: str(80).min(1), whatWePost: list(220, 8), postingFrequency: nstr(120), positioning: str(600) }),
  vip: z.object({
    name: str(60).min(1),
    delivery: str(300).min(1),
    benefits: list(240, 10).min(1),
    volume: nstr(300),
    coverage: nstr(400),
    marketTypes: nstr(600),
    combos: nstr(500),
    plansDifferOnlyInDuration: z.boolean(),
    refundPolicy: nstr(300),
    cancellation: nstr(400),
    trackRecord: z
      .object({
        periods: z
          .array(z.object({ label: str(60).min(1), total: count, won: count, lost: count, void: count, averageOdds: z.number().min(1).max(100), profitUnits: z.number().min(-10000).max(10000) }))
          .min(1)
          .max(12),
        scope: str(240),
        disclaimer: str(240).min(10),
      })
      .nullable(),
    testimonials: z.array(z.object({ author: str(60).min(1), text: str(600).min(1) })).max(6),
    activePromotion: nstr(300),
  }),
  plans: z
    .array(
      z.object({
        key: z.enum(["weekly", "monthly", "three_months"]),
        name: str(40).min(1),
        priceLabel: str(60).min(1),
        price: z.number().positive().max(100000),
        billingType: z.enum(["recurring", "one_time"]),
        billingLabel: str(220).min(1),
        bestFor: str(220),
      }),
    )
    .length(3),
  voiceExamples: list(220, 12),
  neverSay: list(320, 15),
});
type BusinessInput = z.infer<typeof businessSchema>;

/* ------------------------------------------------------------------ */
/*  Defaults snapshot (taken once, before any override is applied)     */
/* ------------------------------------------------------------------ */

const D = {
  business: clone(BUSINESS),
  blocks: { ...PROMPT_BLOCKS },
  stages: { ...STAGE_INSTRUCTIONS } as Dict<string>,
  rules: Object.fromEntries(
    (Object.keys(RULE_SPECS) as RuleGroup[]).map((g) => [g, Object.fromEntries(Object.keys(RULE_SPECS[g]).map((k) => [k, RULE_TARGETS[g][k]!]))]),
  ) as Record<RuleGroup, Dict<number>>,
  weights: Object.fromEntries(signalRows.map((s) => [s.key, s.weight])) as Dict<number>,
  followupRules: Object.fromEntries(allFollowupRules().map((r) => [r.key, { afterSilentHours: r.afterSilentHours, goal: r.goal, fallback: r.fallback }])),
};

export type StoredSettings = {
  business?: unknown;
  prompts?: { blocks?: Dict<string>; stages?: Dict<string> };
  rules?: { funnel?: Dict<number>; followups?: Dict<number>; learning?: Dict<number>; retention?: Dict<number>; support?: Dict<number>; weights?: Dict<number>; followupRules?: Dict<{ afterSilentHours: number; goal: string; fallback: string }> };
};
export type SettingsSection = keyof StoredSettings;

/* ------------------------------------------------------------------ */
/*  Apply                                                              */
/* ------------------------------------------------------------------ */

const num = (v: unknown, [min, max]: readonly [number, number]): number | undefined => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? undefined : Math.min(max, Math.max(min, n));
};
const text = (v: unknown, max: number, allowEmpty = false): string | undefined =>
  typeof v === "string" && v.length <= max && (allowEmpty || v.trim()) ? v : undefined;

function assignBusiness(data: BusinessInput): void {
  // Plan key / env var mapping is fixed by the code; everything the customer reads is editable.
  const plans = D.business.plans.map((p) => ({ ...p, ...(data.plans.find((x) => x.key === p.key) ?? {}) }));
  Object.assign(BUSINESS, { ...data, plans });
}

function applyStored(s: StoredSettings): void {
  Object.assign(BUSINESS, clone(D.business));
  if (s.business) {
    const parsed = businessSchema.safeParse(s.business);
    if (parsed.success) assignBusiness(parsed.data);
    else console.error("[settings] stored business info is invalid, using defaults:", parsed.error.issues[0]);
  }

  for (const k of Object.keys(D.blocks) as PromptBlockKey[]) PROMPT_BLOCKS[k] = text(s.prompts?.blocks?.[k], 8000, k === "extra") ?? D.blocks[k];
  for (const k of Object.keys(D.stages)) (STAGE_INSTRUCTIONS as Dict<string>)[k] = text(s.prompts?.stages?.[k], 2500) ?? D.stages[k]!;

  for (const g of Object.keys(RULE_SPECS) as RuleGroup[]) {
    for (const [k, range] of Object.entries(RULE_SPECS[g])) RULE_TARGETS[g][k] = num(s.rules?.[g]?.[k], range) ?? D.rules[g][k]!;
  }
  for (const row of signalRows) row.weight = num(s.rules?.weights?.[row.key], [-20, 20]) ?? D.weights[row.key]!;
  for (const rule of allFollowupRules()) {
    const o = s.rules?.followupRules?.[rule.key];
    const d = D.followupRules[rule.key]!;
    rule.afterSilentHours = num(o?.afterSilentHours, [1, 720]) ?? d.afterSilentHours;
    rule.goal = text(o?.goal, 700) ?? d.goal;
    rule.fallback = text(o?.fallback, 600) ?? d.fallback;
  }
}

/* ------------------------------------------------------------------ */
/*  Load / save                                                        */
/* ------------------------------------------------------------------ */

const TTL_MS = 20_000;
const KB_KEY = "support_kb";

function applyKnowledge(list: unknown): void {
  SUPPORT_KB.length = 0;
  if (!Array.isArray(list)) return;
  for (const e of list.slice(-SUPPORT.maxKnowledgeEntries) as Dict[]) {
    const issue = text(e?.issue, 300);
    const solution = text(e?.solution, 700);
    if (issue && solution) SUPPORT_KB.push({ id: String(e.id ?? SUPPORT_KB.length), issue: issue.trim(), solution: solution.trim(), created_at: typeof e.created_at === "string" ? e.created_at : undefined, ticket_id: typeof e.ticket_id === "number" ? e.ticket_id : undefined });
  }
}
let loadedAt = 0;

async function readStored(): Promise<StoredSettings> {
  const { data, error } = await db().from("app_state").select("value").eq("key", "settings").maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.value ?? {}) as StoredSettings;
}

/** Never throws: if the database is unreachable the bot keeps running with the last known (or default) settings. */
export async function loadSettings(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < TTL_MS) return;
  try {
    const { data, error } = await db().from("app_state").select("key, value").in("key", ["settings", KB_KEY]);
    if (error) throw new Error(error.message);
    applyStored((data?.find((r) => r.key === "settings")?.value ?? {}) as StoredSettings);
    applyKnowledge(data?.find((r) => r.key === KB_KEY)?.value);
    loadedAt = Date.now();
  } catch (error) {
    console.error("[settings] could not load, keeping current values:", (error as Error).message);
    loadedAt = Date.now() - TTL_MS / 2; // try again in ~10s
  }
}

const BLOCKING = new Set(["guaranteed_result", "risk_free", "easy_money", "certainty", "fake_scarcity", "chasing_losses"]);
function forbiddenIn(texts: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    if (!t) continue;
    const hits = findForbiddenClaims(t).filter((h) => BLOCKING.has(h));
    if (hits.length) out.push(`Bu metin yasak bir vaat içeriyor (garanti / risksiz / kolay para / sahte aciliyet / kaybı geri kazan): “${t.slice(0, 90)}”`);
  }
  return out;
}

export class SettingsError extends Error {
  constructor(public problems: string[]) {
    super(problems.join("\n"));
  }
}

/** Returns the cleaned value to store, or throws SettingsError with messages in Turkish. */
export function validateSection(section: SettingsSection, value: unknown): unknown {
  if (section === "business") {
    const parsed = businessSchema.safeParse(value);
    if (!parsed.success) throw new SettingsError(parsed.error.issues.slice(0, 6).map((i) => `Hatalı alan → ${i.path.join(" › ")}: ${i.message}`));
    const b = parsed.data;
    const problems = forbiddenIn([
      ...b.freeChannel.whatWePost, b.freeChannel.positioning, b.freeChannel.postingFrequency,
      ...b.vip.benefits, b.vip.volume, b.vip.coverage, b.vip.marketTypes, b.vip.combos, b.vip.delivery,
      ...b.plans.flatMap((p) => [p.name, p.priceLabel, p.billingLabel, p.bestFor]),
      ...b.voiceExamples, ...b.vip.testimonials.map((t) => t.text),
    ]);
    for (const p of b.vip.trackRecord?.periods ?? []) {
      if (p.won + p.lost + p.void !== p.total) problems.push(`Sonuç geçmişi “${p.label}”: kazanan + kaybeden + iptal = toplam olmalı (${p.won}+${p.lost}+${p.void} ≠ ${p.total}).`);
    }
    if (problems.length) throw new SettingsError(problems);
    return b;
  }
  if (section === "prompts") {
    const v = (value ?? {}) as NonNullable<StoredSettings["prompts"]>;
    const blocks: Dict<string> = {};
    const stages: Dict<string> = {};
    for (const k of Object.keys(D.blocks)) {
      const t = text(v.blocks?.[k], 8000, k === "extra");
      if (t === undefined && k !== "extra") throw new SettingsError([`“${k}” bölümü boş olamaz ve 8000 karakteri geçemez.`]);
      blocks[k] = t ?? "";
    }
    for (const k of Object.keys(D.stages)) {
      const t = text(v.stages?.[k], 2500);
      if (t === undefined) throw new SettingsError([`“${k}” aşama talimatı boş olamaz ve 2500 karakteri geçemez.`]);
      stages[k] = t;
    }
    return { blocks, stages };
  }
  // rules
  const v = (value ?? {}) as NonNullable<StoredSettings["rules"]>;
  const out: NonNullable<StoredSettings["rules"]> = { funnel: {}, followups: {}, learning: {}, retention: {}, support: {}, weights: {}, followupRules: {} };
  for (const g of Object.keys(RULE_SPECS) as RuleGroup[]) {
    for (const [k, range] of Object.entries(RULE_SPECS[g])) out[g]![k] = num(v[g]?.[k], range) ?? D.rules[g][k]!;
  }
  for (const row of signalRows) out.weights![row.key] = num(v.weights?.[row.key], [-20, 20]) ?? D.weights[row.key]!;
  for (const rule of allFollowupRules()) {
    const o = v.followupRules?.[rule.key];
    const d = D.followupRules[rule.key]!;
    out.followupRules![rule.key] = { afterSilentHours: num(o?.afterSilentHours, [1, 720]) ?? d.afterSilentHours, goal: text(o?.goal, 700) ?? d.goal, fallback: text(o?.fallback, 600) ?? d.fallback };
  }
  const problems = forbiddenIn(Object.values(out.followupRules!).map((r) => r.fallback));
  if (out.followups!.sendFromHour! >= out.followups!.sendUntilHour!) problems.push("Takip mesajı saatleri: başlangıç saati bitiş saatinden küçük olmalı.");
  if (out.funnel!.forceFreeInviteAfterReplies! < out.funnel!.minRepliesBeforeFreeInvite!) problems.push("“Daveti zorunlu yap” değeri, “davet için en az cevap” değerinden küçük olamaz.");
  if (problems.length) throw new SettingsError(problems);
  return out;
}

async function writeStored(stored: StoredSettings): Promise<void> {
  const { error } = await db().from("app_state").upsert({ key: "settings", value: stored, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  applyStored(stored);
  loadedAt = Date.now();
}

export async function saveSection(section: SettingsSection, value: unknown): Promise<void> {
  const clean = validateSection(section, value);
  const stored = await readStored();
  await writeStored({ ...stored, [section]: clean });
}

export async function resetSection(section: SettingsSection): Promise<void> {
  const stored = await readStored();
  delete stored[section];
  await writeStored(stored);
}

/* ------------------------------------------------------------------ */
/*  Everything the admin panel needs to draw its forms                 */
/* ------------------------------------------------------------------ */

export function settingsView() {
  const live = {
    business: clone(BUSINESS),
    prompts: { blocks: { ...PROMPT_BLOCKS }, stages: { ...STAGE_INSTRUCTIONS } },
    rules: {
      ...(Object.fromEntries((Object.keys(RULE_SPECS) as RuleGroup[]).map((g) => [g, Object.fromEntries(Object.keys(RULE_SPECS[g]).map((k) => [k, RULE_TARGETS[g][k]]))])) as Record<RuleGroup, Dict<number>>),
      weights: Object.fromEntries(signalRows.map((s) => [s.key, s.weight])),
      followupRules: Object.fromEntries(allFollowupRules().map((r) => [r.key, { afterSilentHours: r.afterSilentHours, goal: r.goal, fallback: r.fallback }])),
    },
  };
  return {
    ...live,
    defaults: { business: D.business, prompts: { blocks: D.blocks, stages: D.stages }, rules: { ...D.rules, weights: D.weights, followupRules: D.followupRules } },
    specs: RULE_SPECS,
    signals: signalRows.map((s) => ({ key: s.key, source: s.source, description: s.description })),
    followupBuckets: Object.fromEntries(Object.entries(FOLLOWUP_RULES).map(([bucket, rules]) => [bucket, rules.map((r) => ({ key: r.key, keyboard: r.keyboard }))])),
    knowledge: SUPPORT_KB.map((k) => ({ ...k })),
    lockedPrompt: lockedPromptPart(),
    fullPrompt: salesAgentStaticPrompt(),
  };
}

/* ------------------------------------------------------------------ */
/*  Bot knowledge: issue → solution pairs taught by the owner          */
/* ------------------------------------------------------------------ */

/** Full replace (admin panel). Entries with an empty issue or solution are dropped. */
export async function saveKnowledge(entries: unknown): Promise<void> {
  const clean: KnowledgeEntry[] = [];
  for (const e of (Array.isArray(entries) ? entries : []) as Dict[]) {
    const issue = text(e?.issue, 300)?.trim();
    const solution = text(e?.solution, 700)?.trim();
    if (!issue || !solution) continue;
    clean.push({ id: String(e.id ?? `k${Date.now()}${clean.length}`), issue, solution, created_at: typeof e.created_at === "string" ? e.created_at : new Date().toISOString(), ...(typeof e.ticket_id === "number" ? { ticket_id: e.ticket_id } : {}) });
  }
  if (clean.length > SUPPORT.maxKnowledgeEntries) throw new SettingsError([`En fazla ${SUPPORT.maxKnowledgeEntries} kayıt tutulabilir (bot her cevapta hepsini okur). Eskileri silin.`]);
  const problems = forbiddenIn(clean.map((k) => k.solution));
  if (problems.length) throw new SettingsError(problems);
  const { error } = await db().from("app_state").upsert({ key: KB_KEY, value: clean, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  applyKnowledge(clean);
}

/** Append one entry (Telegram → "Teach the AI"). The oldest entry makes room when the list is full. */
export async function addKnowledge(entry: { issue: string; solution: string; ticket_id?: number }): Promise<void> {
  const { data, error } = await db().from("app_state").select("value").eq("key", KB_KEY).maybeSingle();
  if (error) throw new Error(error.message);
  const current = (Array.isArray(data?.value) ? data.value : []) as Dict[];
  await saveKnowledge([...current, { ...entry, id: `k${Date.now()}`, created_at: new Date().toISOString() }].slice(-SUPPORT.maxKnowledgeEntries));
}
