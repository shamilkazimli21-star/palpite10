import { NextRequest, NextResponse } from "next/server";

import {
  attachTelegramUser,
  createLead,
  getLeadById,
  getLeadByTelegramId,
  getRecentMessages,
  incrementCounter,
  recordMessage,
  recalculateLeadScore,
  recordVipOfferShown,
  setCriterion,
  updateCriteria,
  updateLead,
  shouldShowVipOffer,
} from "@/src/lib/lead";

import {
  AGENT_CONFIG,
  VIP_PLANS,
  type AgentStage,
} from "@/src/config/agent";

import {
  answerCallbackQuery,
  freeChannelKeyboard,
  getChatMember,
  isActiveChannelMember,
  sendMessage,
} from "@/src/lib/telegram";

import { runAgent } from "@/src/lib/agent";
import { getEnv } from "@/src/lib/env";
import { sendMetaEvent } from "@/src/lib/meta";

export const runtime = "nodejs";

function getStageForLead(
  lead: any
): AgentStage {
  if (lead.paid) return "PAID";

  if (lead.vip_offer_shown)
    return "VIP_OFFERED";

  if (lead.free_channel_joined)
    return "ENGAGED";

  if (lead.free_channel_invited)
    return "FREE_PENDING_CHECK";

  return "DISCOVERY";
}

async function sendVipOffer(
  lead: any,
  chatId: number
) {
  const env = getEnv();

  const aiResult = await runAgent({
    stage: "VIP_OFFERED",
    userMessage:
      "O usuário está elegível para receber a apresentação do VIP. Faça a transição natural e explique o valor do VIP.",
    history: [],
    lead,
  });

  await sendMessage({
    chatId,
    text: aiResult.reply,
  });

  const buttons = VIP_PLANS.map(
    (plan) => [
      {
        text: `${plan.name} · ${plan.priceLabel}`,
        url:
          `${env.APP_URL}` +
          `/api/checkout/redirect` +
          `?lead=${encodeURIComponent(
            lead.id
          )}` +
          `&plan=${encodeURIComponent(
            plan.key
          )}`,
      },
    ]
  );

  await sendMessage({
    chatId,
    text:
      "Se quiser conhecer as opções, estas são as formas de acesso disponíveis:",
    replyMarkup: {
      inline_keyboard: buttons,
    },
  });

  if (env.TELEGRAM_VIP_CHANNEL_URL) {
    // We deliberately do not send this before payment.
  }

  await recordVipOfferShown(lead.id);
}

async function processUserMessage(
  lead: any,
  telegramUserId: number,
  chatId: number,
  text: string,
  telegramMessageId?: number
) {
  await recordMessage({
    leadId: lead.id,
    role: "user",
    content: text,
    telegramMessageId,
  });

  const stage = getStageForLead(lead);

  const history =
    await getRecentMessages(
      lead.id,
      14
    );

  const result = await runAgent({
    stage,
    userMessage: text,
    history,
    lead,
  });

  await updateCriteria(
    lead.id,
    result.criteria
  );

  await recalculateLeadScore(
    lead.id
  );

  const refreshed =
    await getLeadById(lead.id);

  if (!refreshed) {
    throw new Error(
      "Lead disappeared."
    );
  }

  await recordMessage({
    leadId: lead.id,
    role: "assistant",
    content: result.reply,
  });

  await sendMessage({
    chatId,
    text: result.reply,
  });

  if (
    !refreshed.free_channel_joined
  ) {
    await incrementCounter(
      lead.id,
      "pre_free_turns"
    );

    const latest =
      await getLeadById(lead.id);

    if (
      latest &&
      !latest.free_channel_invited &&
      Number(
        latest.pre_free_turns
      ) >=
        AGENT_CONFIG.funnel
          .minimumPreFreeUserReplies
    ) {
      await updateLead(
        lead.id,
        {
          free_channel_invited: true,
          stage: "FREE_INVITE",
        }
      );

      await sendMessage({
        chatId,
        text:
          "Aliás, temos um canal gratuito do PALPITE10 onde compartilhamos conteúdo de futebol e palpites gratuitos. Se quiser, posso te mandar para lá 👇",
        replyMarkup:
          freeChannelKeyboard(),
      });
    }

    return;
  }

  await incrementCounter(
    lead.id,
    "post_free_turns"
  );

  const afterTurn =
    await getLeadById(lead.id);

  if (!afterTurn) return;

  const eligible =
    await shouldShowVipOffer(
      afterTurn
    );

  if (eligible) {
    await sendVipOffer(
      afterTurn,
      chatId
    );
  }
}

async function handleStart(
  leadId: string | null,
  from: any,
  chatId: number
) {
  let lead =
    leadId
      ? await getLeadById(leadId)
      : null;

  if (!lead) {
    lead =
      await getLeadByTelegramId(
        String(from.id)
      );
  }

  if (!lead) {
    lead = await createLead();
  }

  lead =
    await attachTelegramUser(
      lead.id,
      {
        telegramUserId:
          String(from.id),
        firstName:
          from.first_name,
        username:
          from.username,
      }
    );

  await setCriterion(
    lead.id,
    "returns_to_bot",
    1,
    "Telegram /start interaction detected."
  );

  await recalculateLeadScore(
    lead.id
  );

  if (lead.paid) {
    await sendMessage({
      chatId,
      text:
        "Você já está registrado como membro VIP. 👑",
    });

    return;
  }

  const history =
    await getRecentMessages(
      lead.id,
      10
    );

  const result =
    await runAgent({
      stage: "DISCOVERY",
      userMessage:
        "Primeiro contato. Cumprimente a pessoa e faça uma única pergunta natural para descobrir como ela acompanha previsões de futebol. Não fale de VIP e ainda não envie o canal.",
      history,
      lead,
    });

  await recordMessage({
    leadId: lead.id,
    role: "assistant",
    content: result.reply,
  });

  await sendMessage({
    chatId,
    text: result.reply,
  });

  await sendMetaEvent({
    eventName: "Lead",
    eventId: `lead_${lead.id}`,
    lead,
  });
}

async function handleFreeChannelCheck(
  callbackQuery: any
) {
  const env = getEnv();

  const userId =
    callbackQuery.from.id;

  const chatId =
    callbackQuery.message.chat.id;

  const lead =
    await getLeadByTelegramId(
      String(userId)
    );

  if (!lead) {
    await answerCallbackQuery(
      callbackQuery.id,
      "Não encontrei sua sessão. Envie /start novamente."
    );

    return;
  }

  const member =
    await getChatMember(
      env.TELEGRAM_FREE_CHANNEL_ID,
      userId
    );

  if (
    !isActiveChannelMember(member)
  ) {
    await answerCallbackQuery(
      callbackQuery.id,
      "Ainda não consegui confirmar sua entrada."
    );

    await sendMessage({
      chatId,
      text:
        "Parece que você ainda não entrou no canal. Entre pelo botão acima e depois toque em <b>Já entrei</b>. 👆",
      replyMarkup:
        freeChannelKeyboard(),
    });

    return;
  }

  await answerCallbackQuery(
    callbackQuery.id,
    "Entrada confirmada! ✅"
  );

  await updateLead(
    lead.id,
    {
      free_channel_joined: true,
      stage: "FREE_JOINED",
    }
  );

  await setCriterion(
    lead.id,
    "joined_free_channel",
    1,
    "Telegram membership was verified by getChatMember."
  );

  await recalculateLeadScore(
    lead.id
  );

  const updated =
    await getLeadById(lead.id);

  const history =
    await getRecentMessages(
      lead.id,
      12
    );

  const result =
    await runAgent({
      stage: "FREE_JOINED",
      userMessage:
        "O sistema confirmou que o usuário entrou no canal gratuito. Agora dê boas-vindas, explique brevemente o que ele encontrará no canal e faça uma pergunta natural sobre o que ele procura.",
      history,
      lead: updated,
    });

  await recordMessage({
    leadId: lead.id,
    role: "assistant",
    content: result.reply,
  });

  await sendMessage({
    chatId,
    text: result.reply,
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const env = getEnv();

    const secret =
      request.headers.get(
        "x-telegram-bot-api-secret-token"
      );

    if (
      secret !==
      env.TELEGRAM_WEBHOOK_SECRET
    ) {
      return new NextResponse(
        "Unauthorized",
        { status: 401 }
      );
    }

    const update =
      await request.json();

    if (update.callback_query) {
      const callback =
        update.callback_query;

      if (
        callback.data ===
        "check_free_channel"
      ) {
        await handleFreeChannelCheck(
          callback
        );
      }

      return NextResponse.json({
        ok: true,
      });
    }

    const message =
      update.message;

    if (!message?.from) {
      return NextResponse.json({
        ok: true,
      });
    }

    const from =
      message.from;

    const chatId =
      message.chat.id;

    const text =
      typeof message.text === "string"
        ? message.text.trim()
        : "";

    if (!text) {
      return NextResponse.json({
        ok: true,
      });
    }

    if (
      text.startsWith("/start")
    ) {
      const parts =
        text.split(/\s+/);

      const payload =
        parts[1] ?? null;

      await handleStart(
        payload,
        from,
        chatId
      );

      return NextResponse.json({
        ok: true,
      });
    }

    let lead =
      await getLeadByTelegramId(
        String(from.id)
      );

    if (!lead) {
      lead = await createLead();

      lead =
        await attachTelegramUser(
          lead.id,
          {
            telegramUserId:
              String(from.id),
            firstName:
              from.first_name,
            username:
              from.username,
          }
        );
    }

    await processUserMessage(
      lead,
      from.id,
      chatId,
      text,
      message.message_id
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "[Telegram webhook]",
      error
    );

    // Telegram expects a successful response.
    // The error is logged server-side.
    return NextResponse.json({
      ok: true,
    });
  }
}
