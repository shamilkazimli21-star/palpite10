import { getEnv } from "../lib/env";
import { BUSINESS } from "../config/business";
import { createSingleUseInvite, removeFromChannel, sendText, TelegramError } from "../lib/telegram";
import { recordEvent, recordMessage, updateLead, type Lead } from "../lib/leads";
import { notifyAdmin } from "../lib/admin";

/**
 * After a confirmed payment:
 *  1. TELEGRAM_VIP_CHANNEL_ID set  → bot creates a single-use, 7-day invite link (best).
 *  2. only TELEGRAM_VIP_CHANNEL_URL → sends that link.
 *  3. neither                       → tells the customer access comes from Whop, alerts the owner.
 * Idempotent: `vip_access_sent` prevents duplicates on webhook retries.
 */
export async function deliverVipAccess(lead: Lead, planName: string): Promise<void> {
  if (!lead.chat_id) {
    await notifyAdmin(`⚠️ Payment received for lead ${lead.id} but it has no Telegram chat. Deliver VIP access manually.`);
    return;
  }
  if (lead.vip_access_sent) return;

  const env = getEnv();
  let link: string | null = null;
  let warning: string | null = null;

  if (env.TELEGRAM_VIP_CHANNEL_ID) {
    try {
      link = await createSingleUseInvite(env.TELEGRAM_VIP_CHANNEL_ID, `VIP ${lead.first_name ?? lead.telegram_user_id ?? ""}`.trim());
    } catch (error) {
      warning = `Could not create VIP invite (${(error as Error).message}). Is the bot an admin of the VIP channel with "Invite users via link"?`;
    }
  }
  link = link ?? env.TELEGRAM_VIP_CHANNEL_URL ?? null;

  const text = link
    ? `Pagamento confirmado! ✅\n\nBem-vindo ao ${BUSINESS.vip.name} (${planName}). Toque no botão abaixo para entrar no canal VIP.\n\nO link é só seu — não compartilhe.`
    : `Pagamento confirmado! ✅\n\nBem-vindo ao ${BUSINESS.vip.name} (${planName}). Seu acesso está sendo liberado pela Whop — se não aparecer em alguns minutos, me avise por aqui que a equipe resolve.`;

  try {
    await sendText(lead.chat_id, text, link ? { keyboard: { inline_keyboard: [[{ text: "👑 Entrar no canal VIP", url: link }]] } } : {});
    await recordMessage(lead.id, "assistant", text);
    await updateLead(lead.id, { vip_access_sent: true, last_bot_message_at: new Date().toISOString() });
    await recordEvent(lead.id, "VIP_ACCESS_SENT", { via: env.TELEGRAM_VIP_CHANNEL_ID && !warning ? "single_use_invite" : link ? "static_link" : "whop" });
  } catch (error) {
    warning = `Could not message the customer about VIP access: ${(error as Error).message}`;
    if (error instanceof TelegramError && error.isBlocked) await updateLead(lead.id, { blocked: true });
  }

  if (warning) await notifyAdmin(`⚠️ VIP access for ${lead.first_name ?? lead.id} (@${lead.username ?? "-"}): ${warning}`);
  else if (!link) await notifyAdmin(`ℹ️ ${lead.first_name ?? lead.id} paid, but no VIP channel is configured — access must come from Whop.`);
}

export async function revokeVipAccess(lead: Lead, reason: string): Promise<void> {
  const env = getEnv();
  await updateLead(lead.id, { vip_active: false, vip_access_sent: false });
  await recordEvent(lead.id, "VIP_ACCESS_REVOKED", { reason });

  if (env.TELEGRAM_VIP_CHANNEL_ID && lead.telegram_user_id) {
    try {
      await removeFromChannel(env.TELEGRAM_VIP_CHANNEL_ID, lead.telegram_user_id);
    } catch (error) {
      await notifyAdmin(`⚠️ Could not remove ${lead.first_name ?? lead.id} from the VIP channel (${reason}): ${(error as Error).message}`);
    }
  }
  if (lead.chat_id && !lead.blocked && !lead.opted_out && reason !== "refund") {
    const text = `Seu acesso ao ${BUSINESS.vip.name} terminou. Valeu por ter acompanhado com a gente! Se quiser voltar, é só mandar /planos. O canal gratuito continua aberto pra você.`;
    await sendText(lead.chat_id, text).then(
      () => recordMessage(lead.id, "assistant", text),
      () => undefined,
    );
  }
}
