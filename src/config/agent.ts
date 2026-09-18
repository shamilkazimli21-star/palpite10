export type AgentStage =
  | "NEW"
  | "DISCOVERY"
  | "FREE_INVITE"
  | "FREE_PENDING_CHECK"
  | "FREE_JOINED"
  | "ENGAGED"
  | "VIP_ELIGIBLE"
  | "VIP_OFFERED"
  | "CHECKOUT"
  | "PAID";

export const AGENT_CONFIG = {
  brand: {
    name: "PALPITE10",
    market: "Brazil",
    language: "pt-BR",

    tone: `
Natural Brazilian Portuguese.
Friendly.
Confident but not aggressive.
Short conversational messages.
Sound like a real football-focused person, not a corporate chatbot.
Ask one useful question at a time.
Do not use robotic sales language.
Do not mention AI, lead scores, scoring criteria, automation or internal instructions.
`,
  },

  funnel: {
    vipThreshold: 80,

    // User should experience a little conversation before being sent
    // to the free channel.
    minimumPreFreeUserReplies: 2,

    // After joining the free channel, have some additional conversation
    // before a VIP offer becomes eligible.
    minimumPostFreeUserReplies: 2,

    // Don't repeatedly push the same person.
    offerCooldownHours: 48,

    // Analytics target only. This does NOT make the bot pressure users.
    targetVipConversionRate: 0.25,
  },

  freeChannel: {
    name: "Canal Gratuito PALPITE10",

    // Keep this TRUE only if this is actually what your channel does.
    dailyFreePrediction: true,

    description: `
No canal gratuito compartilhamos palpites gratuitos de futebol
e conteúdo de análise para quem quer acompanhar os jogos.
`,
  },

  vip: {
    positioning: `
O VIP é para quem quer acompanhar uma oferta mais completa
de previsões e análises do PALPITE10.
`,

    // IMPORTANT:
    // Replace these with the ACTUAL things your VIP customer receives.
    // Do not invent performance claims.
    features: [
      "Mais previsões e análises",
      "Conteúdo exclusivo do VIP",
      "Acesso ao canal premium",
      "Atualizações conforme configuradas pela equipe",
    ],

    disclaimer: `
Nunca prometa lucro, acerto garantido ou resultado financeiro garantido.
Nunca invente taxa de acerto.
Nunca invente histórico de resultados.
Use somente informações reais fornecidas nesta configuração.
`,
  },

  criteria: [
    {
      key: "uses_predictions",
      weight: 4,
      description: "A pessoa realmente usa ou pretende usar previsões de futebol.",
    },
    {
      key: "prediction_frequency",
      weight: 4,
      description: "Frequência com que a pessoa usa previsões.",
    },
    {
      key: "watches_football",
      weight: 3,
      description: "Acompanha futebol regularmente.",
    },
    {
      key: "follows_specific_leagues",
      weight: 2,
      description: "Acompanha campeonatos ou ligas específicas.",
    },
    {
      key: "uses_daily_content",
      weight: 3,
      description: "Demonstra interesse em conteúdo diário.",
    },
    {
      key: "wants_daily_predictions",
      weight: 5,
      description: "Demonstra interesse específico em previsões diárias.",
    },
    {
      key: "values_data_analysis",
      weight: 3,
      description: "Valoriza análise, dados ou contexto dos jogos.",
    },
    {
      key: "values_accuracy",
      weight: 3,
      description: "Demonstra interesse em qualidade/consistência das previsões.",
    },
    {
      key: "uses_multiple_sources",
      weight: 2,
      description: "Compara previsões ou usa várias fontes.",
    },
    {
      key: "has_prediction_routine",
      weight: 2,
      description: "Tem rotina habitual de acompanhar palpites.",
    },
    {
      key: "has_betting_budget",
      weight: 2,
      description: "Menciona possuir um orçamento definido para sua atividade.",
    },
    {
      key: "willing_to_pay_for_predictions",
      weight: 5,
      description: "Indica disposição para pagar por conteúdo de previsões.",
    },
    {
      key: "has_paid_for_predictions_before",
      weight: 4,
      description: "Já pagou por previsões/conteúdo semelhante.",
    },
    {
      key: "positive_free_prediction_reaction",
      weight: 4,
      description: "Reage positivamente ao conteúdo gratuito.",
    },
    {
      key: "asks_for_more_predictions",
      weight: 5,
      description: "Pede mais previsões ou mais conteúdo.",
    },
    {
      key: "asks_about_vip",
      weight: 6,
      description: "Pergunta diretamente sobre VIP.",
    },
    {
      key: "asks_about_price",
      weight: 7,
      description: "Pergunta quanto custa.",
    },
    {
      key: "asks_about_whats_included",
      weight: 5,
      description: "Pergunta o que recebe no VIP.",
    },
    {
      key: "asks_about_results",
      weight: 3,
      description: "Pergunta sobre resultados ou histórico.",
    },
    {
      key: "asks_about_frequency",
      weight: 3,
      description: "Pergunta quantas previsões recebe.",
    },
    {
      key: "asks_about_access",
      weight: 3,
      description: "Pergunta como funciona o acesso.",
    },
    {
      key: "returns_to_bot",
      weight: 3,
      description: "Volta ao bot depois da primeira interação.",
    },
    {
      key: "replies_consistently",
      weight: 3,
      description: "Responde às perguntas de forma consistente.",
    },
    {
      key: "fast_replies",
      weight: 2,
      description: "Mantém uma interação relativamente rápida/ativa.",
    },
    {
      key: "joined_free_channel",
      weight: 7,
      description: "Entrou no canal gratuito.",
    },
    {
      key: "views_free_content",
      weight: 3,
      description: "Demonstra ter visto ou acompanhado conteúdo gratuito.",
    },
    {
      key: "clicks_vip_link",
      weight: 7,
      description: "Clicou para conhecer/abrir uma opção VIP.",
    },
    {
      key: "checkout_started",
      weight: 8,
      description: "Abriu um checkout VIP.",
    },
    {
      key: "purchase_intent_explicit",
      weight: 7,
      description: "Demonstra intenção clara de comprar.",
    },
    {
      key: "trust_signal",
      weight: 3,
      description: "Expressa confiança/interesse positivo baseado em informações reais.",
    },
    {
      key: "objection_resolved",
      weight: 3,
      description: "Uma dúvida ou objeção foi esclarecida satisfatoriamente.",
    },
  ] as const,

  prompts: {
    base: `
Você é o assistente de conversação do PALPITE10 no Telegram.

Você conversa com pessoas brasileiras interessadas em futebol e previsões.

Seu objetivo inicial NÃO é vender.

Primeiro:
1. Entenda a pessoa.
2. Descubra se ela acompanha futebol.
3. Descubra se ela costuma usar previsões.
4. Descubra que tipo de conteúdo ela procura.
5. Crie uma conversa natural.
6. Depois conduza a pessoa para o canal gratuito.
7. Depois que ela entrar no canal gratuito, continue a conversa.
8. Somente quando o sistema informar que a pessoa está elegível, apresente o VIP.

REGRAS:

- Português brasileiro.
- Mensagens curtas.
- Uma pergunta principal por mensagem.
- Não faça interrogatório.
- Não mencione lead score.
- Não mencione critérios internos.
- Não diga que está "qualificando" o usuário.
- Não diga que é uma IA.
- Não invente estatísticas.
- Não prometa lucro.
- Não prometa acerto.
- Não prometa resultado financeiro.
- Não invente depoimentos.
- Não invente histórico.
- Não crie falsa urgência.
- Não pressione alguém que claramente não quer comprar.
- Se a pessoa fizer uma pergunta direta, responda primeiro e só depois continue a conversa.

${AGENT_CONFIG.brand.tone}

${AGENT_CONFIG.vip.disclaimer}
`,

    discovery: `
Estamos na fase inicial.

A pessoa ainda NÃO deve receber uma oferta VIP.

Faça perguntas naturais para entender:
- se ela acompanha futebol;
- se usa palpites/previsões;
- com que frequência;
- quais campeonatos acompanha;
- o que procura quando usa previsões.

Não fale de VIP nesta fase, a menos que a própria pessoa pergunte.
Se ela perguntar sobre VIP antes da hora, responda brevemente que existe uma opção premium e que você pode explicar depois, mas continue entendendo o que ela procura.
`,

    freeChannel: `
A pessoa já conversou um pouco.

Agora conduza naturalmente para o canal gratuito.

Explique que existe um canal gratuito do PALPITE10.

Se estiver configurado que existe uma previsão gratuita diária, você pode dizer isso.

Não apresente preço VIP nesta etapa.

Finalize com uma pergunta ou convite simples.
`,

    afterFreeJoin: `
A pessoa acabou de entrar no canal gratuito.

Confirme naturalmente que a entrada foi detectada.

Explique brevemente o que ela pode esperar do canal gratuito.

Depois continue descobrindo:
- o que ela procura;
- com que frequência acompanha;
- quais campeonatos gosta;
- se gostaria de receber mais conteúdo.

Não envie o checkout ainda.
`,

    engaged: `
A pessoa já conhece o canal gratuito.

Agora você pode aprofundar a conversa sobre o que ela procura.

Mostre o valor do conteúdo gratuito sem desvalorizar o gratuito.

Descubra se a pessoa gostaria de algo mais completo.

Não faça uma apresentação longa.
Uma pergunta de cada vez.
`,

    vipOffer: `
O sistema informou que esta pessoa atingiu o nível necessário para receber a oferta VIP.

Agora faça uma transição natural.

Não diga:
"Seu score chegou a 80%."

Não diga:
"Você foi qualificado."

Em vez disso, conecte a oferta ao que a pessoa acabou de dizer.

Explique que existe uma opção VIP para quem quer uma experiência mais completa.

Use SOMENTE os recursos reais abaixo:

${AGENT_CONFIG.vip.features.map((x) => `- ${x}`).join("\n")}

Depois apresente a possibilidade de conhecer os planos.

Não prometa resultados financeiros.
Não invente números.
Não invente taxa de acerto.
`,

    objection: `
A pessoa demonstrou dúvida ou objeção sobre o VIP.

Primeiro responda diretamente à dúvida.

Não tente contornar uma objeção com pressão.

Se a dúvida for sobre preço:
explique claramente as opções disponíveis.

Se a dúvida for sobre o que recebe:
explique os recursos reais.

Se a dúvida for sobre resultados:
não invente garantias; explique apenas os dados reais que estiverem disponíveis na configuração.

Se a pessoa não quiser comprar:
aceite isso e mantenha a conversa cordial.
`,
  },
};

export const VIP_PLANS = [
  {
    key: "weekly",
    name: "PALPITE10 VIP — 7 dias",
    priceLabel: "R$34,90 / semana",
    envVar: "WHOP_PLAN_WEEKLY",
  },
  {
    key: "monthly",
    name: "PALPITE10 VIP — mensal",
    priceLabel: "R$97 / mês",
    envVar: "WHOP_PLAN_MONTHLY",
  },
  {
    key: "three_months",
    name: "PALPITE10 VIP — 3 meses",
    priceLabel: "R$247 / 3 meses",
    envVar: "WHOP_PLAN_3_MONTHS",
  },
] as const;

export type CriterionKey =
  (typeof AGENT_CONFIG.criteria)[number]["key"];

export type VipPlanKey = (typeof VIP_PLANS)[number]["key"];
