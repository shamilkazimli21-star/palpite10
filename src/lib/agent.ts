import {
  AGENT_CONFIG,
  type AgentStage,
} from "@/src/config/agent";
import {
  getEnv,
} from "./env";
import {
  type ExtractedCriteria,
} from "./score";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildCriteriaInstructions() {
  return AGENT_CONFIG.criteria
    .map(
      (criterion) =>
        `- ${criterion.key}: ${criterion.description}`
    )
    .join("\n");
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {}

  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      reply: text,
      criteria: {},
      intent: "neutral",
    };
  }
}

export async function runAgent(params: {
  stage: AgentStage;
  userMessage: string;
  history: ConversationMessage[];
  lead: any;
}) {
  const env = getEnv();

  const stagePrompt =
    params.stage === "DISCOVERY"
      ? AGENT_CONFIG.prompts.discovery
      : params.stage === "FREE_INVITE"
        ? AGENT_CONFIG.prompts.freeChannel
        : params.stage === "FREE_JOINED"
          ? AGENT_CONFIG.prompts.afterFreeJoin
          : params.stage === "ENGAGED"
            ? AGENT_CONFIG.prompts.engaged
            : params.stage === "VIP_OFFERED"
              ? AGENT_CONFIG.prompts.objection
              : AGENT_CONFIG.prompts.discovery;

  const system = `
${AGENT_CONFIG.prompts.base}

CURRENT STAGE:
${params.stage}

CURRENT LEAD SCORE:
${params.lead.score ?? 0}/100

FREE CHANNEL JOINED:
${params.lead.free_channel_joined ? "yes" : "no"}

VIP OFFER ALREADY SHOWN:
${params.lead.vip_offer_shown ? "yes" : "no"}

${stagePrompt}

SCORING CRITERIA:

${buildCriteriaInstructions()}

IMPORTANT SCORING RULE:

Only assign a positive value when there is evidence in the conversation
or from a verified system event.

Value must be between 0 and 1.

Examples:

0 = no evidence
0.5 = partial/uncertain evidence
1 = clear evidence

Do NOT assume something just because it sounds plausible.

Return ONLY valid JSON:

{
  "reply": "the message to send to the user",
  "criteria": {
    "criterion_key": {
      "value": 0,
      "evidence": "short explanation"
    }
  },
  "intent": "neutral"
}

Possible intent values:

neutral
interested
question
objection
purchase_intent
vip_interest
not_interested

Do not return markdown.
Do not return additional fields.
`;

  const messages = [
    {
      role: "system",
      content: system,
    },
    ...params.history,
    {
      role: "user",
      content: params.userMessage,
    },
  ];

  const response = await fetch(
    `${env.DEEPSEEK_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL,
        temperature: 0.7,
        messages,
        response_format: {
          type: "json_object",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "DeepSeek error:",
      response.status,
      errorText
    );

    throw new Error("AI request failed.");
  }

  const result = await response.json();

  const content =
    result?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("DeepSeek returned no content.");
  }

  const parsed = extractJson(content);

  return {
    reply:
      typeof parsed.reply === "string"
        ? parsed.reply.trim()
        : "Entendi. Me conta um pouco mais sobre isso.",
    criteria:
      (parsed.criteria ?? {}) as ExtractedCriteria,
    intent:
      typeof parsed.intent === "string"
        ? parsed.intent
        : "neutral",
  };
}
