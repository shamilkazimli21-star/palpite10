import { getEnv } from "./env";

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

async function telegramRequest<T>(
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const env = getEnv();

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data =
    (await response.json()) as TelegramResponse<T>;

  if (!response.ok || !data.ok) {
    throw new Error(
      `Telegram ${method} failed: ${
        data.description ?? response.statusText
      }`
    );
  }

  return data.result as T;
}

export async function sendMessage(params: {
  chatId: string | number;
  text: string;
  replyMarkup?: Record<string, unknown>;
}) {
  return telegramRequest("sendMessage", {
    chat_id: params.chatId,
    text: params.text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: params.replyMarkup,
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
) {
  return telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function getChatMember(
  chatId: string,
  userId: number
) {
  return telegramRequest<any>("getChatMember", {
    chat_id: chatId,
    user_id: userId,
  });
}

export function isActiveChannelMember(
  member: any
) {
  if (!member) return false;

  if (
    member.status === "creator" ||
    member.status === "administrator" ||
    member.status === "member"
  ) {
    return true;
  }

  if (
    member.status === "restricted" &&
    member.is_member === true
  ) {
    return true;
  }

  return false;
}

export async function setTelegramWebhook() {
  const env = getEnv();

  return telegramRequest("setWebhook", {
    url: `${env.APP_URL}/api/telegram/webhook`,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: [
      "message",
      "callback_query",
    ],
    drop_pending_updates: false,
  });
}

export function freeChannelKeyboard() {
  const env = getEnv();

  return {
    inline_keyboard: [
      [
        {
          text: "📲 Entrar no canal gratuito",
          url: env.TELEGRAM_FREE_CHANNEL_URL,
        },
      ],
      [
        {
          text: "✅ Já entrei",
          callback_data: "check_free_channel",
        },
      ],
    ],
  };
}
