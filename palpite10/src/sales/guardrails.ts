import { allowedStatNumbers, BUSINESS } from "../config/business";

/**
 * Prompts ask nicely; this file ENFORCES.
 * Everything the bot is about to send — and everything the Sales Coach
 * proposes to add to the playbook — passes through findForbiddenClaims().
 */

/* ------------------------------------------------------------------ */
/*  Opt-out                                                           */
/* ------------------------------------------------------------------ */

// "para" alone is just the Portuguese word "for/to", so only accept it as a whole message.
const OPT_OUT_WHOLE = /^\s*\/?(parar|pare|para|stop|sair|cancelar|descadastrar|chega|basta)[\s.!]*$/i;
const OPT_OUT_PHRASE =
  /(n[aã]o\s+(quero|desejo)\s+(mais\s+)?receber|par[ae]\s+de\s+(me\s+)?(mandar|enviar|encher)|n[aã]o\s+me\s+(mande|manda|envie|chame)\s+mais|me\s+tir[ae]\s+d(a|essa)\s+lista|n[aã]o\s+me\s+perturbe|vou\s+(te\s+)?bloquear)/i;

export function isOptOut(text: string): boolean {
  return OPT_OUT_WHOLE.test(text) || OPT_OUT_PHRASE.test(text);
}

/* ------------------------------------------------------------------ */
/*  Forbidden claims                                                  */
/* ------------------------------------------------------------------ */

type Rule = { id: string; pattern: RegExp };

const RULES: Rule[] = [
  { id: "guaranteed_result", pattern: /garant\w*\s+(de\s+|o\s+|a\s+|seu\s+|teu\s+)?(lucro|green|acerto|resultado|ganho|retorno|vit[oó]ria)/gi },
  { id: "guaranteed_result", pattern: /(lucro|green|acerto|ganho|retorno|resultado)s?\s+(cert[oa]s?|garantid[oa]s?|assegurad[oa]s?)/gi },
  { id: "risk_free", pattern: /(sem|zero)\s+risco|risco\s+zero|n[aã]o\s+tem\s+como\s+(perder|errar)|imposs[ií]vel\s+perder/gi },
  { id: "easy_money", pattern: /dinheiro\s+f[aá]cil|renda\s+(extra\s+)?garantida|fique\s+rico|enriquecer|ganhe\s+dinheiro\s+(todo|todos)/gi },
  { id: "certainty", pattern: /\b100\s?%|certeza\s+(absoluta|de\s+(green|lucro|acerto))|aposta\s+segura|palpite\s+certo|jogo\s+(comprado|arranjado|manipulado)/gi },
  { id: "fake_scarcity", pattern: /[uú]ltimas?\s+vagas?|vagas?\s+limitadas?|restam\s+(s[oó]\s+)?\d+|s[oó]\s+(at[eé]\s+)?hoje|[uú]ltima\s+chance|oferta\s+(acaba|termina|expira)|corre\s+que/gi },
  { id: "chasing_losses", pattern: /recuper(ar|e)\s+(o\s+que\s+|suas?\s+)?(perd|preju)|dobr(ar|e)\s+(a\s+)?(banca|aposta)|apost(ar|e)\s+(mais\s+alto|tudo)|pegu?e\s+emprestado/gi },
];

// Hit-rate / ROI percentages: only the EXACT numbers computed from business.ts trackRecord may be written.
const PERCENT = /(\d{1,3}(?:[.,]\d+)?)\s?%/g;
const RESULT_WORD = /acert|assertiv|aproveitamento|lucr|\broi\b|green|retorno|win\s?rate|ganh/i;

function hasUnverifiedStatistic(text: string): boolean {
  const allowed = new Set(allowedStatNumbers().map((n) => Number(n.replace(",", "."))));
  PERCENT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PERCENT.exec(text))) {
    const around = text.slice(Math.max(0, match.index - 45), match.index + match[0].length + 45);
    if (!RESULT_WORD.test(around)) continue;
    if (!allowed.has(Number(match[1]!.replace(",", ".")))) return true;
  }
  return false;
}

/** True when the text quotes track-record numbers, so the mandatory disclaimer must follow. */
export function quotesResults(text: string): boolean {
  PERCENT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PERCENT.exec(text))) {
    const around = text.slice(Math.max(0, match.index - 45), match.index + match[0].length + 45);
    if (RESULT_WORD.test(around)) return true;
  }
  return /\bunidades\b/i.test(text) && RESULT_WORD.test(text);
}

/** Appends the disclaimer if the model quoted results and forgot it. */
export function ensureResultsDisclaimer(messages: string[]): string[] {
  const t = BUSINESS.vip.trackRecord;
  const joined = messages.join("\n");
  if (!t || !quotesResults(joined)) return messages;
  if (/passado|n[aã]o\s+(existe\s+|h[aá]\s+|tem\s+)?garant/i.test(joined)) return messages;
  return [...messages, t.disclaimer];
}

const NEGATION = /\b(n[aã]o|nunca|nem|ningu[eé]m|nenhum[a]?|jamais|sem)\b[^.!?\n]{0,40}$/i;

function isNegated(text: string, index: number): boolean {
  // "não existe lucro garantido", "ninguém garante acerto" are HONEST statements — allow them.
  return NEGATION.test(text.slice(Math.max(0, index - 60), index));
}

export function findForbiddenClaims(text: string): string[] {
  const found = new Set<string>();
  if (hasUnverifiedStatistic(text)) found.add("unverified_statistic");

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(text))) {
      if (!isNegated(text, match.index)) found.add(rule.id);
      if (match.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
    }
  }
  if (!BUSINESS.vip.activePromotion && /\b(desconto|cupom|promo[cç][aã]o)\b/i.test(text)) {
    const index = text.search(/\b(desconto|cupom|promo[cç][aã]o)\b/i);
    if (!isNegated(text, index)) found.add("invented_promotion");
  }
  if (/https?:\/\/|t\.me\//i.test(text)) found.add("raw_link");
  return [...found];
}

/** Used when the model keeps producing something unsafe, or is down. pt-BR. */
export const SAFE_FALLBACK_REPLY = "Boa pergunta. Deixa eu confirmar isso direitinho com a equipe pra não te passar informação errada, tá?";
export const TECHNICAL_FALLBACK_REPLY = "Opa, deu uma travadinha aqui do meu lado 😅 Pode mandar de novo?";
