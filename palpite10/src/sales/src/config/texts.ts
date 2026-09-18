import { BUSINESS } from "./business";

/**
 * FIXED MESSAGES the bot sends without asking the AI (pt-BR). Defaults live here;
 * the owner edits them in the admin panel → "Hazır Mesajlar" (src/lib/settings.ts applies the changes).
 * Placeholders: {brand} {vip} {age} {frequency} — and, where noted, {plan} {support}.
 */
export const TEXTS = {
  plansIntro: "Planos do {vip}:",
  plansFooter: "Todos dão o mesmo acesso ao VIP — muda só o período. São assinaturas: renovam automaticamente e você pode cancelar quando quiser pela Whop.\n\nToque em um plano para abrir o pagamento seguro 👇",
  freeInviteFallback: "Aliás, a gente tem um canal gratuito do {brand} no Telegram. Quer dar uma olhada? É só tocar aqui 👇",
  canal: "O canal gratuito do {brand} tem {frequency}. É só tocar aqui 👇",
  joinConfirmed: "Confirmado ✅",
  joinNotFound: "Ainda não te encontrei no canal. Entre pelo botão “Entrar no canal gratuito” e toque aqui de novo.",
  alreadyVipStart: "Você já é membro do {vip} 👑 Se precisar de ajuda com o acesso, é só me escrever.",
  alreadyVip: "Você já é membro do {vip} 👑",
  doNotSell: "No momento não consigo te oferecer o VIP por aqui. O conteúdo é apenas para maiores de {age} anos e para quem joga com responsabilidade.",
  optOutDone: "Pronto, não te mando mais mensagens por aqui. Se mudar de ideia, é só enviar /start. Valeu! 👋",
  help: "Comandos: /planos (ver o VIP) · /canal (canal gratuito) · /parar (não receber mais mensagens). Ou só me escreve normalmente 🙂",
  handoffContact: "Pra falar com alguém da equipe {brand}: {support}",
  audioReply: "Não consigo ouvir áudio por aqui agora 🙏 Pode me mandar por texto? Aí te respondo na hora.",
  nonTextReply: "Por enquanto eu só consigo ler mensagens de texto 🙂 Me escreve aqui que eu te respondo.",
  imageReceived: "Recebi sua imagem 👍 Eu não consigo ver imagens por aqui, então já encaminhei pra equipe. Eles te respondem por aqui mesmo.",
  imageNoTeam: "Eu não consigo ver imagens por aqui 😕 Pode me descrever em texto o que aparece?",
  ticketAck: "Recebido 👍 A equipe já está vendo e te responde por aqui mesmo.",
  vipDelivered: "Pagamento confirmado! ✅\n\nBem-vindo ao {vip} ({plan}). Toque no botão abaixo para entrar no canal VIP.\n\nO link é só seu — não compartilhe.",
  vipDeliveredNoLink: "Pagamento confirmado! ✅\n\nBem-vindo ao {vip} ({plan}). Seu acesso está sendo liberado pela Whop — se não aparecer em alguns minutos, me avise por aqui que a equipe resolve.",
  vipEnded: "Seu acesso ao {vip} terminou. Valeu por ter acompanhado com a gente! Se quiser voltar, é só mandar /planos. O canal gratuito continua aberto pra você.",
  paymentFailed: "Vi aqui que o pagamento não foi aprovado 😕 Às vezes é só o banco/cartão. Se quiser tentar de novo, mande /planos — e se precisar de ajuda é só me falar.",
  technicalFallback: "Opa, deu uma travadinha aqui do meu lado 😅 Pode mandar de novo?",
  safeFallback: "Boa pergunta. Deixa eu confirmar isso direitinho com a equipe pra não te passar informação errada, tá?",
  btnJoinFree: "📲 Entrar no canal gratuito",
  btnJoined: "✅ Já entrei",
  btnVip: "👑 Entrar no canal VIP",
  btnSupport: "💬 Falar com a equipe",
};
export type TextKey = keyof typeof TEXTS;

export function fill(template: string, vars: Record<string, string | number | null | undefined> = {}): string {
  const all: Record<string, string | number | null | undefined> = {
    brand: BUSINESS.brand,
    vip: BUSINESS.vip.name,
    age: BUSINESS.minimumAge,
    frequency: BUSINESS.freeChannel.postingFrequency ?? "palpites gratuitos",
    ...vars,
  };
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (all[key] === undefined || all[key] === null ? whole : String(all[key])));
}
export const tx = (key: TextKey, vars?: Record<string, string | number | null | undefined>) => fill(TEXTS[key], vars);
