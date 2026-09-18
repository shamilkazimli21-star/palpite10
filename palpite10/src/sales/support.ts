import { SUPPORT } from "../config/funnel";
import { supportContact } from "../config/business";
import { deepseekJson } from "../lib/deepseek";
import { getEnv } from "../lib/env";
import { getLeadById, getRecentMessages, recordEvent, recordMessage, updateLead, type Lead } from "../lib/leads";
import { addKnowledge, SettingsError } from "../lib/settings";
import { db } from "../lib/supabase";
import { answerCallback, sendText, tg, TelegramError, type InlineKeyboard } from "../lib/telegram";
import { hoursSince, truncate } from "../lib/util";

/**
 * SUPPORT TICKETS — the owner answers customers from his own Telegram.
 *
 *  customer sends a screenshot / asks for a human
 *      → ticket opens, the AI goes quiet for this person, the owner gets the message with buttons
 *  owner taps "Reply" (or simply replies to the message) → text is sent to the customer in pt-BR
 *  customer answers → forwarded to the owner again ("solved?")
 *  owner taps "Solved" → the AI takes over again
 *  owner taps "Teach the AI" → issue + solution become bot knowledge (src/config/prompts.ts → SUPPORT_KB)
 *
 * A ticket nobody touched for SUPPORT.autoReleaseHours is released automatically, so a customer is
 * never left in silence because the owner is asleep.
 */

export type Ticket = { id: number; lead_id: string; status: "open" | "solved" | "expired"; reason: string | null; last_activity_at: string };
type Mode = "reply" | "teach";

const adminChat = () => getEnv().TELEGRAM_ADMIN_CHAT_ID ?? null;
const who = (lead: Lead) => `${lead.first_name ?? "Customer"}${lead.username ? ` (@${lead.username})` : ""}`;
const buttons = (id: number): InlineKeyboard => ({
  inline_keyboard: [
    [{ text: "✍️ Reply", callback_data: `tk:reply:${id}` }, { text: "✅ Solved", callback_data: `tk:done:${id}` }],
    [{ text: "🧠 Teach the AI (issue + solution)", callback_data: `tk:teach:${id}` }],
  ],
});

async function remember(messageId: number | undefined, ticketId: number, mode: Mode): Promise<void> {
  if (!messageId) return;
  const { error } = await db().from("support_admin_messages").upsert({ message_id: messageId, ticket_id: ticketId, mode }, { onConflict: "message_id" });
  if (error) console.error("[support] remember:", error.message);
}

async function toAdmin(ticketId: number, text: string, mode: Mode, markup?: Record<string, unknown>): Promise<void> {
  const chat = adminChat();
  if (!chat) return;
  try {
    const sent = await tg<{ message_id: number }>("sendMessage", { chat_id: chat, text: truncate(text, 3900), link_preview_options: { is_disabled: true }, ...(markup ? { reply_markup: markup } : {}) });
    await remember(sent.message_id, ticketId, mode);
  } catch (error) {
    console.error("[support] toAdmin:", error);
  }
}

async function translate(text: string, target: "pt" | "en"): Promise<string | null> {
  try {
    const system =
      target === "pt"
        ? 'You rewrite a support agent\'s message into natural, friendly Brazilian Portuguese for a Telegram chat. Keep the meaning, names, numbers, links and steps EXACTLY; add nothing. If it is already Portuguese, return it unchanged. Reply ONLY with a json object {"text":"..."}'
        : 'Translate this customer message into English, literally. Reply ONLY with a json object {"text":"..."}';
    const { json } = await deepseekJson({ messages: [{ role: "system", content: system }, { role: "user", content: text.slice(0, 2500) }], temperature: 0.1, maxTokens: 1200, thinking: false, timeoutMs: 20_000, retries: 0, label: "support-translate" });
    const t = (json as { text?: unknown } | null)?.text;
    return typeof t === "string" && t.trim() ? t.trim() : null;
  } catch {
    return null;
  }
}

export async function getOpenTicket(leadId: string): Promise<Ticket | null> {
  const { data, error } = await db().from("support_tickets").select("id, lead_id, status, reason, last_activity_at").eq("lead_id", leadId).eq("status", "open").order("id", { ascending: false }).limit(1);
  if (error) {
    console.error("[support] getOpenTicket:", error.message, "— did you run supabase/support_and_cleanup.sql?");
    return null;
  }
  return (data?.[0] as Ticket | undefined) ?? null;
}

const touch = (id: number) => db().from("support_tickets").update({ last_activity_at: new Date().toISOString() }).eq("id", id);

/** Returns null when tickets cannot work (no admin chat configured, or the SQL update was not run). */
export async function openTicket(lead: Lead, o: { reason: "screenshot" | "handoff"; text?: string | null; copyFrom?: { chatId: number; messageId: number } }): Promise<Ticket | null> {
  const chat = adminChat();
  if (!chat) return null;

  let ticket = await getOpenTicket(lead.id);
  const isNew = !ticket;
  if (!ticket) {
    const { data, error } = await db().from("support_tickets").insert({ lead_id: lead.id, reason: o.reason }).select("id, lead_id, status, reason, last_activity_at").single();
    if (error) {
      console.error("[support] openTicket:", error.message, "— did you run supabase/support_and_cleanup.sql?");
      return null;
    }
    ticket = data as Ticket;
    await recordEvent(lead.id, "SUPPORT_TICKET_OPENED", { ticket: ticket.id, reason: o.reason });
  } else await touch(ticket.id);
  await updateLead(lead.id, { needs_human: true });

  const english = o.text ? await translate(o.text, "en") : null;
  const header =
    `${o.reason === "screenshot" ? "📸 Screenshot" : "🙋 Wants a human"} · ticket #${ticket.id}${isNew ? "" : " (still open)"}\n` +
    `${who(lead)} · id ${lead.telegram_user_id} · ${lead.vip_active ? "VIP CUSTOMER" : lead.paid ? "paid before" : `not a customer, stage ${lead.stage}`}` +
    (o.text ? `\n\n“${truncate(o.text, 500)}”${english && english !== o.text ? `\nEN: ${truncate(english, 500)}` : ""}` : "") +
    `\n\nThe AI is paused for this person. Tap Reply (any language — I send it in Portuguese).`;

  try {
    if (o.copyFrom) {
      // copyMessage (not forward): works even when the customer hides forwards, and lets us attach the buttons.
      const sent = await tg<{ message_id: number }>("copyMessage", { chat_id: chat, from_chat_id: o.copyFrom.chatId, message_id: o.copyFrom.messageId, caption: truncate(header, 1000), reply_markup: buttons(ticket.id) });
      await remember(sent.message_id, ticket.id, "reply");
    } else await toAdmin(ticket.id, header, "reply", buttons(ticket.id));
  } catch (error) {
    console.error("[support] could not reach the admin chat:", error);
    await toAdmin(ticket.id, header + "\n\n(The image could not be copied.)", "reply", buttons(ticket.id));
  }
  return ticket;
}

async function release(ticket: Ticket, status: "solved" | "expired"): Promise<void> {
  await db().from("support_tickets").update({ status, solved_at: new Date().toISOString() }).eq("id", ticket.id);
  await updateLead(ticket.lead_id, { needs_human: false });
  await recordMessage(ticket.lead_id, "event", status === "solved" ? "A equipe humana resolveu o atendimento. O assistente virtual volta a responder normalmente." : "A equipe humana não respondeu a tempo. O assistente virtual volta a responder; se o problema continuar, ofereça o contato do suporte.");
  await recordEvent(ticket.lead_id, status === "solved" ? "SUPPORT_TICKET_SOLVED" : "SUPPORT_TICKET_EXPIRED", { ticket: ticket.id });
}

/**
 * Called for every TEXT the customer writes while `needs_human` is set.
 * true  → the text went to the owner, the AI must stay quiet.
 * false → no open ticket (or it just expired) → the AI answers as usual.
 */
export async function routeToOpenTicket(lead: Lead, text: string, telegramMessageId: number): Promise<boolean> {
  const ticket = await getOpenTicket(lead.id);
  if (!ticket) return false;
  if (hoursSince(ticket.last_activity_at) >= SUPPORT.autoReleaseHours) {
    await release(ticket, "expired");
    await toAdmin(ticket.id, `⏰ Ticket #${ticket.id} (${who(lead)}) had no activity for ${SUPPORT.autoReleaseHours}h — the AI is answering again. Replying to any ticket message re-opens it.`, "reply");
    return false;
  }
  if (!(await recordMessage(lead.id, "user", text.slice(0, 2000), telegramMessageId))) return true; // Telegram retry
  await updateLead(lead.id, { user_turns: lead.user_turns + 1, last_user_message_at: new Date().toISOString(), followups_since_reply: 0, blocked: false });
  await touch(ticket.id);
  const english = await translate(text, "en");
  await toAdmin(ticket.id, `💬 ${who(lead)} · ticket #${ticket.id}\n\n“${truncate(text, 1500)}”${english && english !== text ? `\nEN: ${truncate(english, 1500)}` : ""}\n\nSolved? Tap ✅ and the AI continues. Otherwise Reply.`, "reply", buttons(ticket.id));
  // Do not leave the person staring at silence — but at most one acknowledgement per hour.
  if (lead.chat_id && hoursSince(lead.last_bot_message_at) >= 1) {
    await sendText(lead.chat_id, "Recebido 👍 A equipe já está vendo e te responde por aqui mesmo.").then(
      () => updateLead(lead.id, { last_bot_message_at: new Date().toISOString() }),
      () => undefined,
    );
  }
  return true;
}

/** Customer sent a photo / image file. The bot cannot see images, so a human looks at it. */
export async function handleCustomerImage(lead: Lead, m: { chat: { id: number }; message_id: number; caption?: string }): Promise<void> {
  if (!(await recordMessage(lead.id, "user", `[a pessoa enviou uma imagem]${m.caption ? ` ${m.caption.slice(0, 1000)}` : ""}`, m.message_id))) return;
  await updateLead(lead.id, { last_user_message_at: new Date().toISOString(), followups_since_reply: 0 });
  const ticket = await openTicket(lead, { reason: "screenshot", text: m.caption, copyFrom: { chatId: m.chat.id, messageId: m.message_id } });
  const support = supportContact();
  const reply = ticket
    ? "Recebi sua imagem 👍 Eu não consigo ver imagens por aqui, então já encaminhei pra equipe. Eles te respondem por aqui mesmo."
    : `Eu não consigo ver imagens por aqui 😕 Pode me descrever em texto o que aparece?${support ? ` Se preferir, fale com a equipe: ${support.label}` : ""}`;
  if (lead.chat_id) {
    await sendText(lead.chat_id, reply);
    await recordMessage(lead.id, "assistant", reply);
    await updateLead(lead.id, { last_bot_message_at: new Date().toISOString() });
  }
}

/* ------------------------------------------------------------------ */
/*  Owner side                                                         */
/* ------------------------------------------------------------------ */

async function ticketWithLead(id: number): Promise<{ ticket: Ticket; lead: Lead } | null> {
  const { data } = await db().from("support_tickets").select("id, lead_id, status, reason, last_activity_at").eq("id", id).maybeSingle();
  const lead = data ? await getLeadById((data as Ticket).lead_id) : null;
  return data && lead ? { ticket: data as Ticket, lead } : null;
}

const forceReply = (placeholder: string) => ({ force_reply: true, input_field_placeholder: placeholder });
const TEACH_HELP = "Write in any language:\n1) what the problem was\n2) how it is solved\n\nI turn it into a knowledge entry and the bot handles this case alone next time. You can edit or delete entries in /admin → Satış Asistanı.";

export async function handleAdminCallback(q: { id: string; data?: string }): Promise<void> {
  const match = q.data?.match(/^tk:(reply|done|teach):(\d+)$/);
  const found = match ? await ticketWithLead(Number(match[2])) : null;
  if (!match || !found) return answerCallback(q.id, "Ticket not found.");
  const { ticket, lead } = found;
  await answerCallback(q.id);

  if (match[1] === "reply") {
    await toAdmin(ticket.id, `✍️ Ticket #${ticket.id} — write your reply to ${who(lead)}.\nAny language: I send it in Brazilian Portuguese and show you what was sent. Start with ! to send your text exactly as written.`, "reply", forceReply("Your reply to the customer…"));
  } else if (match[1] === "teach") {
    await toAdmin(ticket.id, `🧠 Teach the AI — ticket #${ticket.id}\n${TEACH_HELP}`, "teach", forceReply("Issue: … Solution: …"));
  } else {
    if (ticket.status === "open") await release(ticket, "solved");
    await toAdmin(ticket.id, `✅ Ticket #${ticket.id} solved — the AI is answering ${who(lead)} again.\n\n🧠 Optional but valuable: reply to THIS message with the issue and the solution.\n${TEACH_HELP}`, "teach");
  }
}

async function teach(ticket: Ticket, lead: Lead, note: string): Promise<void> {
  const history = await getRecentMessages(lead.id, 10);
  const context = history.map((m) => `${m.role === "user" ? "CUSTOMER" : m.role === "assistant" ? "TEAM/BOT" : "SYSTEM"}: ${m.content}`).join("\n");
  const { json } = await deepseekJson({
    messages: [
      {
        role: "system",
        content:
          'You turn a business owner\'s note about a customer-support case into a reusable knowledge entry for a Brazilian Telegram sales bot. Reply ONLY with a json object {"issue":"...","solution":"..."} written in Brazilian Portuguese. "issue": how a customer would describe the problem, max 200 characters. "solution": what the bot should tell the customer to do, short plain-text steps, max 450 characters, no URLs starting with http, no promises about betting results. Use ONLY what the note (and, if needed, the conversation) says. If the note contains no solution, set "solution" to "".',
      },
      { role: "user", content: `OWNER NOTE:\n${note.slice(0, 2000)}\n\nCONVERSATION (context only):\n${context.slice(-3000)}` },
    ],
    temperature: 0.2, maxTokens: 700, thinking: false, timeoutMs: 30_000, retries: 1, label: "support-teach",
  });
  const entry = json as { issue?: unknown; solution?: unknown } | null;
  const issue = typeof entry?.issue === "string" ? entry.issue.trim() : "";
  const solution = typeof entry?.solution === "string" ? entry.solution.trim() : "";
  if (!issue || !solution) {
    await toAdmin(ticket.id, "🧠 I could not find BOTH an issue and a solution in your note. Reply to this message again, for example:\n“Issue: paid by Pix but did not get the VIP link. Solution: ask them to wait 2 minutes and send /start; if nothing, send the Whop receipt.”", "teach");
    return;
  }
  try {
    await addKnowledge({ issue, solution, ticket_id: ticket.id });
  } catch (error) {
    await toAdmin(ticket.id, `🧠 Not saved: ${error instanceof SettingsError ? error.problems.join(" ") : (error as Error).message}\nReply to this message to try again.`, "teach");
    return;
  }
  await recordEvent(lead.id, "SUPPORT_KNOWLEDGE_ADDED", { ticket: ticket.id });
  await toAdmin(ticket.id, `🧠 Saved. From now on the bot knows:\n\nPROBLEMA: ${issue}\nSOLUÇÃO: ${solution}\n\nEdit or delete it in /admin → Satış Asistanı.${ticket.status === "open" ? "\n\nIs this ticket solved?" : ""}`, "reply", ticket.status === "open" ? buttons(ticket.id) : undefined);
}

/** The owner replied (Telegram "reply") to a ticket message. Returns false if the message is not about a ticket. */
export async function handleAdminReply(m: { text?: string; reply_to_message?: { message_id: number } }): Promise<boolean> {
  if (!m.reply_to_message) return false;
  const { data } = await db().from("support_admin_messages").select("ticket_id, mode").eq("message_id", m.reply_to_message.message_id).maybeSingle();
  if (!data) return false;
  const found = await ticketWithLead(data.ticket_id as number);
  if (!found) return false;
  const { ticket, lead } = found;
  const text = m.text?.trim();
  if (!text) {
    await toAdmin(ticket.id, "I can only pass on TEXT. Please write your reply as text.", data.mode as Mode);
    return true;
  }
  if (data.mode === "teach") {
    await teach(ticket, lead, text);
    return true;
  }

  if (!lead.chat_id) {
    await toAdmin(ticket.id, "This person has no Telegram chat with the bot.", "reply");
    return true;
  }
  const final = text.startsWith("!") ? text.slice(1).trim() : ((await translate(text, "pt")) ?? text);
  try {
    await sendText(lead.chat_id, final);
  } catch (error) {
    const blocked = error instanceof TelegramError && error.isBlocked;
    if (blocked) await updateLead(lead.id, { blocked: true });
    await toAdmin(ticket.id, blocked ? `❌ ${who(lead)} blocked the bot — the message cannot be delivered.` : `❌ Not delivered: ${(error as Error).message}`, "reply");
    return true;
  }
  await recordMessage(lead.id, "assistant", final);
  // Answering a closed ticket re-opens it, so the customer's next message comes back here.
  if (ticket.status !== "open") await db().from("support_tickets").update({ status: "open", solved_at: null }).eq("id", ticket.id);
  await touch(ticket.id);
  await updateLead(lead.id, { needs_human: true, last_bot_message_at: new Date().toISOString() });
  await recordEvent(lead.id, "SUPPORT_REPLY_SENT", { ticket: ticket.id });
  await toAdmin(ticket.id, `📤 Sent to ${who(lead)}:\n\n“${truncate(final, 1500)}”\n\nTheir answer will arrive here. When it is fixed, tap ✅ Solved and the AI continues.`, "reply", buttons(ticket.id));
  return true;
}
