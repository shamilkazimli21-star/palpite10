import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  whop,
  getPlanFromWhopPlanId,
} from "@/src/lib/whop";

import {
  getLeadById,
  recalculateLeadScore,
  setCriterion,
  updateLead,
} from "@/src/lib/lead";

import {
  supabaseAdmin,
} from "@/src/lib/supabase";

import {
  sendMetaEvent,
} from "@/src/lib/meta";

import {
  getEnv,
} from "@/src/lib/env";

export const runtime = "nodejs";

function readMetadata(
  data: any
): Record<string, string> {
  const metadata =
    data?.metadata;

  if (
    !metadata ||
    typeof metadata !== "object"
  ) {
    return {};
  }

  return metadata as Record<
    string,
    string
  >;
}

export async function POST(
  request: NextRequest
) {
  const rawBody =
    await request.text();

  const headers =
    Object.fromEntries(
      request.headers.entries()
    );

  let event: any;

  try {
    event =
      await whop().webhooks.unwrap(
        rawBody,
        { headers }
      );
  } catch (error) {
    console.error(
      "[Whop] Invalid signature",
      error
    );

    return NextResponse.json(
      {
        error:
          "Invalid webhook signature",
      },
      { status: 401 }
    );
  }

  const eventId =
    event.id ??
    event.data?.id;

  if (!eventId) {
    return NextResponse.json(
      {
        error:
          "Missing webhook event ID.",
      },
      { status: 400 }
    );
  }

  const supabase =
    supabaseAdmin();

  /*
   * IDEMPOTENCY
   *
   * Whop can retry webhook deliveries.
   * We save the event ID before processing it.
   */

  const {
    data: existing,
    error: lookupError,
  } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("provider", "whop")
    .eq("event_id", eventId)
    .maybeSingle();

  if (lookupError) {
    console.error(
      "[Whop] Event lookup error",
      lookupError
    );
  }

  if (existing) {
    return NextResponse.json({
      received: true,
      duplicate: true,
    });
  }

  await supabase
    .from("webhook_events")
    .insert({
      provider: "whop",
      event_id: eventId,
      event_type: event.type,
      payload: event,
    });

  const data =
    event.data ?? {};

  /*
   * PAYMENT SUCCESS
   */

  if (
    event.type ===
    "payment.succeeded"
  ) {
    const metadata =
      readMetadata(data);

    const leadId =
      metadata.lead_id;

    const planKey =
      metadata.plan_key;

    if (!leadId) {
      console.error(
        "[Whop] Payment has no lead_id",
        event
      );

      return NextResponse.json({
        received: true,
        warning:
          "Payment received without lead_id.",
      });
    }

    const lead =
      await getLeadById(leadId);

    if (!lead) {
      console.error(
        "[Whop] Lead not found:",
        leadId
      );

      return NextResponse.json({
        received: true,
        warning:
          "Lead not found.",
      });
    }

    /*
     * Extra plan verification.
     */

    const whopPlanId =
      data?.plan?.id;

    if (
      whopPlanId &&
      !getPlanFromWhopPlanId(
        whopPlanId
      )
    ) {
      console.error(
        "[Whop] Unknown plan:",
        whopPlanId
      );
    }

    const amount = Number(
      data?.final_amount ??
      data?.amount ??
      0
    );

    const currency =
      String(
        data?.currency ??
        "BRL"
      ).toUpperCase();

    /*
     * Save payment.
     */

    await supabase
      .from("payments")
      .upsert(
        {
          whop_payment_id:
            data.id ?? eventId,

          lead_id: lead.id,

          plan_key:
            planKey ?? null,

          amount,
          currency,

          status: "paid",

          raw_payload: data,
        },
        {
          onConflict:
            "whop_payment_id",
        }
      );

    /*
     * Update lead.
     */

    await updateLead(
      lead.id,
      {
        paid: true,
        paid_at:
          new Date().toISOString(),
        paid_plan:
          planKey ?? null,
        paid_amount: amount,
        paid_currency:
          currency,
        stage: "PAID",
      }
    );

    await setCriterion(
      lead.id,
      "purchase_intent_explicit",
      1,
      "Whop payment.succeeded confirmed payment."
    );

    await recalculateLeadScore(
      lead.id
    );

    const updatedLead =
      await getLeadById(
        lead.id
      );

    /*
     * META PURCHASE
     *
     * This is sent only after Whop confirms payment.
     */

    if (updatedLead) {
      await sendMetaEvent({
        eventName: "Purchase",

        eventId:
          `purchase_${data.id ?? eventId}`,

        lead: updatedLead,

        value: amount,

        currency,

        contentName:
          "PALPITE10 VIP",

        contentId:
          planKey ?? "vip",
      });
    }

    /*
     * Optional Telegram notification.
     */

    if (
      updatedLead?.telegram_user_id
    ) {
      const env = getEnv();

      const telegramUrl =
        `https://api.telegram.org/bot` +
        `${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

      const text =
        `Pagamento confirmado! ✅\n\n` +
        `Seu acesso ao PALPITE10 VIP foi registrado.\n\n` +
        `Plano: ${planKey ?? "VIP"}`;

      await fetch(
        telegramUrl,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            chat_id:
              updatedLead.telegram_user_id,
            text,
          }),
        }
      );
    }
  }

  /*
   * PAYMENT FAILED
   */

  if (
    event.type ===
    "payment.failed"
  ) {
    const metadata =
      readMetadata(data);

    if (metadata.lead_id) {
      await updateLead(
        metadata.lead_id,
        {
          last_payment_status:
            "failed",
        }
      );
    }
  }

  /*
   * REFUND
   */

  if (
    event.type ===
    "refund.created"
  ) {
    const metadata =
      readMetadata(data);

    if (metadata.lead_id) {
      await updateLead(
        metadata.lead_id,
        {
          payment_refunded: true,
        }
      );
    }
  }

  return NextResponse.json({
    received: true,
  });
}
