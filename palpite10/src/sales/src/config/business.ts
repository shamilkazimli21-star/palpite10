/**
 * =====================================================================
 *  VERIFIED BUSINESS FACTS  —  ✏️  EDIT THIS FILE WITH YOUR REAL DATA
 * =====================================================================
 *
 * The sales agent is only allowed to state what is written here.
 * Anything that is `null` or an empty list is treated as "unknown":
 * the bot says it does not have that information and offers to check
 * with the team instead of inventing an answer.
 *
 * Text that the customer will read is in Brazilian Portuguese.
 * Prices here are what the bot SAYS. What the customer actually PAYS is
 * defined by the Whop plan — keep both identical.
 */

import { INTEGRATION_OVERRIDES } from "../lib/integrations";

export type PlanKey = "weekly" | "monthly" | "three_months";

export type VipPlan = {
  key: PlanKey;
  /** Button label + how the bot names the plan. */
  name: string;
  /** Exactly how the price must be written to customers. */
  priceLabel: string;
  /** Numeric price, used for Meta "InitiateCheckout" value. */
  price: number;
  /** "recurring" = Whop renews automatically until the customer cancels. */
  billingType: "recurring" | "one_time";
  /** How the billing must be explained. Never hide an automatic renewal. */
  billingLabel: string;
  /** One short line the bot can use to explain who this plan is for. */
  bestFor: string;
  /** Env var holding the Whop plan ID (plan_...) OR the Whop checkout link of this plan. */
  envVar: "WHOP_PLAN_WEEKLY" | "WHOP_PLAN_MONTHLY" | "WHOP_PLAN_3_MONTHS";
};

export type TrackRecordPeriod = { label: string; total: number; won: number; lost: number; void: number; averageOdds: number; profitUnits: number };

export const BUSINESS = {
  brand: "PALPITE10",
  currency: "BRL",
  minimumAge: 18,

  freeChannel: {
    name: "Canal Gratuito PALPITE10",
    whatWePost: [
      "1 palpite gratuito por dia, baseado em dados",
      "O mercado indicado para o jogo (ex.: resultado, gols, ambas marcam)",
      "Jogos de futebol escolhidos conforme os dados disponíveis",
      "De vez em quando, um contexto/explicação curta quando ajuda",
    ],
    postingFrequency: "1 palpite gratuito por dia",
    /** Honest positioning: free is not "worse", it is a sample of the same method. */
    positioning:
      "O palpite gratuito usa o mesmo método do VIP. A diferença do VIP é o volume e a seleção completa do dia, não a qualidade. Quem está só no gratuito não recebe a seleção completa.",
  },

  vip: {
    name: "PALPITE10 VIP",
    delivery: "Acesso ao canal VIP privado no Telegram, enviado por aqui mesmo logo após a confirmação do pagamento.",
    /** REAL benefits only. The bot lists these and nothing else. */
    benefits: [
      "A seleção completa do dia: cerca de 8 a 10 palpites por dia, todos baseados em dados",
      "Mais oportunidades em mercados diferentes",
      "Sugestões de combinadas (PALPITE10 COMBO) quando há entradas adequadas",
      "Cobertura diária mais completa do que o canal gratuito",
    ],
    volume: "Aproximadamente 8 a 10 palpites por dia — varia conforme os jogos disponíveis e a qualidade das oportunidades",
    /** Deliberately NOT a selling point: never use leagues/competitions to differentiate VIP from free. */
    coverage: "Os jogos são escolhidos pelos dados, não por campeonato. NÃO cite ligas ou campeonatos específicos como diferencial do VIP.",
    marketTypes:
      "Conforme o que os dados sustentam no dia: resultado final, dupla chance, over/under gols, ambas marcam, handicap asiático, gols por equipe, escanteios, cartões, entre outros. Nem todo mercado aparece todo dia — nunca prometa um mercado específico diariamente.",
    combos: "Além das entradas individuais, o VIP pode trazer uma combinada sugerida (PALPITE10 COMBO) juntando entradas do dia. Só quando há seleções adequadas — não é todo dia.",
    plansDifferOnlyInDuration: true,
    /** e.g. "Reembolso em até 7 dias pela Whop." null = the bot says it will check with the team. */
    refundPolicy: null as string | null,
    cancellation: "A assinatura renova automaticamente e pode ser cancelada a qualquer momento pela conta da pessoa na Whop; o acesso vale até o fim do período já pago.",

    /**
     * ⚠️ KEEP ONLY IF REAL. These numbers are quoted to customers.
     * You must be able to show the record behind them if anyone asks.
     * Set to `null` and the bot will never quote results.
     * Win rate and ROI are COMPUTED from the counts below (voids excluded
     * from the win rate), so every period uses the same formula.
     */
    trackRecord: {
      periods: [
        { label: "01/08/2026 a 31/08/2026", total: 248, won: 141, lost: 92, void: 15, averageOdds: 1.72, profitUnits: 18.4 },
        { label: "01/09/2026 a 15/09/2026", total: 126, won: 76, lost: 43, void: 7, averageOdds: 1.78, profitUnits: 11.8 },
      ] as TrackRecordPeriod[],
      scope: "Palpites do VIP. Os palpites gratuitos são acompanhados separadamente.",
      disclaimer: "Resultado passado não garante resultado futuro. Não existe garantia de acerto nem de lucro.",
    } as { periods: TrackRecordPeriod[]; scope: string; disclaimer: string } | null,

    /**
     * ⚠️ KEEP ONLY IF REAL and the person agreed to be quoted. Quoted verbatim, never paraphrased.
     * Empty list = the bot never mentions testimonials.
     */
    testimonials: [
      {
        author: "Lucas M.",
        text: "Comecei pelo canal grátis e gostei da forma como os palpites são apresentados. Depois entrei no VIP porque queria receber mais opções durante o dia. Gosto principalmente das combinações.",
      },
      {
        author: "Rafael S.",
        text: "O que mais gostei no VIP é a quantidade de opções. No grátis eu recebia um palpite por dia, enquanto no VIP passei a acompanhar várias entradas e também as sugestões de combinação.",
      },
    ] as { author: string; text: string }[],

    /** Real, currently valid promotion. null = the bot never mentions discounts. */
    activePromotion: null as string | null,
  },

  plans: [
    {
      key: "weekly",
      name: "VIP semanal",
      priceLabel: "R$ 34,90 por semana",
      price: 34.9,
      billingType: "recurring",
      billingLabel: "Assinatura semanal — renova automaticamente a cada semana até cancelar.",
      bestFor: "Para conhecer o VIP com o menor valor de entrada.",
      envVar: "WHOP_PLAN_WEEKLY",
    },
    {
      key: "monthly",
      name: "VIP mensal",
      priceLabel: "R$ 97,00 por mês",
      price: 97,
      billingType: "recurring",
      billingLabel: "Assinatura mensal — renova automaticamente a cada mês até cancelar.",
      bestFor: "Para quem acompanha os jogos toda semana.",
      envVar: "WHOP_PLAN_MONTHLY",
    },
    {
      key: "three_months",
      name: "VIP 3 meses",
      priceLabel: "R$ 247,00 a cada 3 meses",
      price: 247,
      billingType: "recurring",
      billingLabel: "Assinatura trimestral — renova automaticamente a cada 3 meses até cancelar.",
      bestFor: "Menor valor por mês para quem já sabe que quer continuar.",
      envVar: "WHOP_PLAN_3_MONTHS",
    },
  ] satisfies VipPlan[] as VipPlan[],

  /** Phrases in the voice you like. The bot may use or adapt them — never as a script. */
  voiceExamples: [
    "Se quiser, te mostro como funciona o VIP.",
    "No canal grátis você já recebe 1 palpite por dia.",
    "No VIP você tem acesso à seleção completa do dia.",
    "Quer que eu te mostre os planos?",
    "Posso te mandar o acesso.",
    "Todos os planos dão o mesmo acesso; muda só o período.",
  ],

  /** Extra things YOU never want the bot to say (added to the built-in safety rules). */
  neverSay: [
    "Pressão repetida: 'compre agora', 'última chance', 'você está perdendo', 'aja agora', 'não perca'",
    "Apresentar aposta como forma garantida ou confiável de ganhar dinheiro",
    "Incentivar a apostar mais porque a pessoa perdeu",
    "Inventar credenciais, histórias de clientes, resultados ou números",
    "Dizer que um plano tem palpites melhores, mais palpites, mais acerto ou suporte prioritário em relação a outro plano",
  ] as string[],
};

export function getPlan(key: string): VipPlan | undefined {
  return BUSINESS.plans.find((p) => p.key === key);
}

/** SUPPORT_USERNAME=@seu_suporte  or  SUPPORT_URL=https://t.me/seu_suporte (Vercel env vars). */
export function supportContact(): { label: string; url: string | null } | null {
  const username = (INTEGRATION_OVERRIDES.supportUsername || process.env.SUPPORT_USERNAME)?.trim().replace(/^@/, "");
  const url = process.env.SUPPORT_URL?.trim();
  if (username) return { label: `@${username}`, url: `https://t.me/${username}` };
  if (url) return { label: "suporte", url };
  return null;
}

const fmt = (n: number, digits = 1) => n.toFixed(digits).replace(".", ",");

export function trackRecordStats(p: TrackRecordPeriod) {
  const decided = p.won + p.lost;
  return {
    winRate: decided ? (p.won / decided) * 100 : 0,
    roi: p.total ? (p.profitUnits / p.total) * 100 : 0,
  };
}

/** Every percentage the bot is allowed to write (used by the guardrail). */
export function allowedStatNumbers(): string[] {
  const t = BUSINESS.vip.trackRecord;
  if (!t) return [];
  return t.periods.flatMap((p) => {
    const s = trackRecordStats(p);
    return [fmt(s.winRate), fmt(s.roi)];
  });
}

function renderTrackRecord(): string {
  const t = BUSINESS.vip.trackRecord;
  if (!t) return "NENHUM DADO DISPONÍVEL — nunca cite taxa de acerto, lucro ou histórico";
  const lines = t.periods.map((p) => {
    const s = trackRecordStats(p);
    return `  • ${p.label}: ${p.total} palpites — ${p.won} certos, ${p.lost} errados, ${p.void} anulados; acerto ${fmt(s.winRate)}% (sem contar anulados); odd média ${fmt(p.averageOdds, 2)}; saldo +${fmt(p.profitUnits)} unidades; ROI +${fmt(s.roi)}%`;
  });
  return [
    `(${t.scope})`,
    ...lines,
    `  REGRAS: só cite estes números quando a pessoa PERGUNTAR sobre resultados/histórico/confiança. Use os números exatamente como estão, sempre com o período. Nunca some, arredonde para cima, projete ganhos ou converta "unidades" em reais. Sempre termine com: "${t.disclaimer}"`,
  ].join("\n");
}

/** Renders the facts block injected into every sales prompt. */
export function renderFacts(): string {
  const b = BUSINESS;
  const unknown = "NÃO INFORMADO (diga que não tem essa informação agora e que pode confirmar com a equipe)";
  const support = supportContact();
  const lines: string[] = [
    `Marca: ${b.brand}`,
    `Idade mínima: ${b.minimumAge} anos`,
    `Atendimento humano: ${
      support ? "existe um contato da equipe; use next_action \"handoff_human\" e o SISTEMA envia o contato (não escreva o contato você mesmo)" : "use next_action \"handoff_human\" e a equipe é avisada"
    }`,
    "",
    `CANAL GRATUITO — ${b.freeChannel.name}`,
    `O que é publicado: ${b.freeChannel.whatWePost.join("; ")}`,
    `Frequência: ${b.freeChannel.postingFrequency ?? unknown}`,
    `Posicionamento: ${b.freeChannel.positioning}`,
    "",
    `VIP — ${b.vip.name}`,
    `Benefícios reais: ${b.vip.benefits.join("; ")}`,
    `Quantidade de palpites: ${b.vip.volume ?? unknown}`,
    `Campeonatos: ${b.vip.coverage ?? unknown}`,
    `Mercados: ${b.vip.marketTypes ?? unknown}`,
    `Combinadas: ${b.vip.combos ?? unknown}`,
    `Como o acesso é entregue: ${b.vip.delivery}`,
    `Diferença entre planos: ${
      b.vip.plansDifferOnlyInDuration
        ? "todos dão acesso ao MESMO canal VIP, com os mesmos palpites; muda apenas o período de cobrança/acesso"
        : "os planos têm diferenças — explique apenas o que está descrito em cada plano"
    }`,
    `Cancelamento: ${b.vip.cancellation ?? unknown}`,
    `Reembolso: ${b.vip.refundPolicy ?? unknown}`,
    `Histórico de resultados: ${renderTrackRecord()}`,
    `Depoimentos autorizados (cite no máximo UM, literalmente, com o nome, e só se a pessoa pedir opinião de quem usa): ${
      b.vip.testimonials.length ? b.vip.testimonials.map((t) => `${t.author}: "${t.text}"`).join(" | ") : "NENHUM — nunca cite depoimentos"
    }`,
    `Promoção ativa: ${b.vip.activePromotion ?? "NENHUMA — nunca mencione desconto, cupom, vagas ou prazo"}`,
    "",
    "PLANOS (preços exatos — nunca altere; são assinaturas, então sempre seja claro que renovam automaticamente):",
    ...b.plans.map((p) => `- ${p.name}: ${p.priceLabel}. ${p.billingLabel} ${p.bestFor}`),
  ];
  if (b.voiceExamples.length) lines.push("", "FRASES NO NOSSO TOM (inspiração, não roteiro):", ...b.voiceExamples.map((x) => `- ${x}`));
  if (b.neverSay.length) lines.push("", "NUNCA:", ...b.neverSay.map((x) => `- ${x}`));
  return lines.join("\n");
}
