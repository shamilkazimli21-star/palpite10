/**
 * LANDING PAGE copy (pt-BR). Defaults live here; the owner edits them in the admin panel → "Açılış Sayfası".
 * Placeholders: {brand} {frequency} {age}. The page refreshes at most 2 minutes after a change.
 * The list under "O que você recebe" comes from İşletme Bilgileri → Ücretsiz kanal → "Kanalda neler paylaşılıyor?".
 */
export const LANDING = {
  eyebrow: "Canal gratuito no Telegram",
  headline1: "Um palpite de futebol por dia.",
  headlineHighlight: "Baseado em dados.",
  headline2: "De graça.",
  lead: "Todo dia a gente escolhe um jogo pelos números e manda o palpite, com o mercado indicado, direto no seu Telegram.",
  cta: "Abrir no Telegram",
  trust1: "Grátis",
  trust2: "Sem cadastro",
  trust3: "Sem cartão",
  micro: "Abre uma conversa rápida com o nosso assistente, que te passa o acesso ao canal.",
  fallbackHint: "Não abriu? Toque aqui para abrir o Telegram",
  previewTitle: "É assim que chega pra você",
  previewLabel: "Palpite grátis do dia",
  previewCaption: "Exemplo do formato. O palpite de verdade chega todo dia no canal.",
  howTitle: "Como funciona",
  step1Title: "Toque no botão",
  step1Text: "O Telegram abre numa conversa com o assistente do {brand}.",
  step2Title: "Entre no canal gratuito",
  step2Text: "Ele te manda o acesso. Você recebe {frequency}.",
  step3Title: "Acompanhe sem compromisso",
  step3Text: "Se um dia quiser a seleção completa, existe o VIP. Se não quiser, o gratuito continua igual.",
  benefitsTitle: "O que você recebe de graça",
  honestTitle: "Papo reto",
  honestText: "Palpite é análise, não garantia. A gente usa dados para escolher os jogos, mas futebol é futebol: ninguém acerta sempre, e nós também não. Nunca aposte dinheiro que faz falta.",
  faqTitle: "Dúvidas rápidas",
  faq1Q: "É grátis mesmo?",
  faq1A: "Sim. O canal gratuito não custa nada e não pede cartão. Existe um VIP pago para quem quiser a seleção completa do dia, mas ninguém é obrigado a assinar.",
  faq2Q: "Vocês garantem que o palpite acerta?",
  faq2A: "Não. Ninguém consegue garantir resultado de futebol. A gente escolhe os jogos com base em dados e mostra o mercado indicado. A decisão é sempre sua.",
  faq3Q: "Preciso ter o Telegram?",
  faq3A: "Sim, o canal funciona dentro do Telegram. Se você ainda não tem, o botão leva para a página de download; depois é só voltar aqui e tocar de novo.",
  faq4Q: "Por que abre uma conversa com um assistente?",
  faq4A: "É ele que te passa o link do canal e tira suas dúvidas. É um assistente virtual, e você para de receber mensagens quando quiser: é só escrever PARAR.",
  cta2: "Quero o palpite grátis de hoje",
  stickyText: "1 palpite grátis por dia",
  footer: "Conteúdo informativo sobre futebol para maiores de {age} anos. O {brand} não é casa de apostas, não recebe apostas e não garante resultados nem lucro. Jogue com responsabilidade. Se o jogo virou um problema, procure ajuda: CVV 188 · Jogadores Anônimos.",
};
export type LandingKey = keyof typeof LANDING;

/** These lines may be left empty in the panel; the element then simply disappears from the page. */
export const LANDING_OPTIONAL_KEYS: LandingKey[] = [
  "eyebrow", "headlineHighlight", "headline2", "micro", "trust1", "trust2", "trust3", "fallbackHint", "previewCaption", "stickyText",
  "faq1Q", "faq1A", "faq2Q", "faq2A", "faq3Q", "faq3A", "faq4Q", "faq4A",
];
