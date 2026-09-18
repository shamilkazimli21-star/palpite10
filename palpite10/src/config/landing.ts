/**
 * LANDING PAGE copy (pt-BR). Defaults live here; the owner edits them in the admin panel → "Açılış Sayfası".
 * Placeholders: {brand} {frequency} {age}. The page refreshes at most 2 minutes after a change.
 */
export const LANDING = {
  eyebrow: "Canal gratuito no Telegram",
  headline1: "Um palpite de futebol por dia.",
  headlineHighlight: "Baseado em dados.",
  headline2: "De graça.",
  lead: "Todo dia a gente escolhe um jogo pelos números e manda o palpite, com o mercado indicado, direto no seu Telegram. Sem cadastro e sem cartão.",
  cta: "Abrir no Telegram",
  micro: "Abre uma conversa rápida com o nosso assistente, que te passa o acesso ao canal.",
  howTitle: "Como funciona",
  step1Title: "Toque no botão",
  step1Text: "O Telegram abre numa conversa com o assistente do {brand}.",
  step2Title: "Entre no canal gratuito",
  step2Text: "Ele te manda o acesso. Você recebe {frequency}.",
  step3Title: "Acompanhe sem compromisso",
  step3Text: "Se um dia quiser a seleção completa, existe o VIP. Se não quiser, o gratuito continua igual.",
  honestTitle: "Papo reto",
  honestText: "Palpite é análise, não garantia. A gente usa dados para escolher os jogos, mas futebol é futebol: ninguém acerta sempre, e nós também não. Nunca aposte dinheiro que faz falta.",
  cta2: "Quero o palpite grátis de hoje",
  footer: "Conteúdo informativo sobre futebol para maiores de {age} anos. O {brand} não é casa de apostas, não recebe apostas e não garante resultados nem lucro. Jogue com responsabilidade. Se o jogo virou um problema, procure ajuda: CVV 188 · Jogadores Anônimos.",
};
export type LandingKey = keyof typeof LANDING;
