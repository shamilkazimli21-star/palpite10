import { loadSettings } from "@/src/lib/settings";
import { NextResponse, type NextRequest } from "next/server";
import { BUSINESS, getPlan } from "@/src/config/business";
import { META_EVENTS } from "@/src/config/funnel";
import { getEnv } from "@/src/lib/env";
import { db } from "@/src/lib/supabase";
import { notifyAdmin } from "@/src/lib/admin";
import { allowRequest } from "@/src/lib/rate-limit";
import { getLeadByToken, recordEvent, recordMessage, setSystemSignal, updateLead } from "@/src/lib/leads";
import { sendMetaEvent } from "@/src/lib/meta";
import { clientIp } from "@/src/lib/util";
import { createCheckout, staticCheckoutUrl } from "@/src/lib/whop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function page(title: string, body: string, status = 200) {
  const bot = (() => {
    try {
      return `https://t.me/${getEnv().TELEGRAM_BOT_USERNAME}`;
    } catch {
      return "/";
    }
  })();
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · ${BUSINESS.brand}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b3d24;color:#fff;font:17px/1.5 system-ui,sans-serif;padding:24px;text-align:center}main{max-width:420px}a{display:inline-block;margin-top:18px;background:#ffd400;color:#10240f;font-weight:700;padding:14px 22px;border-radius:12px;text-decoration:none}</style></head><body><main><h1>${title}</h1><p>${body}</p><a href="${bot}">Voltar para o Telegram</a></main></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  await loadSettings();
  const plan = getPlan(request.nextUrl.searchParams.get("plan") ?? "");
  if (!plan || !/^[A-Za-z0-9_-]{10,64}$/.test(token)) return page("Link inválido", "Volte ao Telegram e envie /planos para receber um link novo.", 400);

  // Link-preview robots must not create checkouts or fire conversion events.
  if (/bot\b|crawler|spider|preview|facebookexternalhit|whatsapp/i.test(request.headers.get("user-agent") ?? "")) return page(plan.name, "Abra este link pelo botão no Telegram.");

  const ip = clientIp(request) ?? "unknown";
  if (!(await allowRequest(`checkout-ip:${ip}`, 30, 3600))) return page("Muitas tentativas", "Aguarde alguns minutos e tente de novo.", 429);

  const lead = await getLeadByToken(token);
  if (!lead) return page("Link inválido", "Volte ao Telegram e envie /planos para receber um link novo.", 404);
  if (lead.do_not_sell) return page("Indisponível", `O ${BUSINESS.vip.name} é apenas para maiores de ${BUSINESS.minimumAge} anos e para quem joga com responsabilidade.`, 403);
  if (!(await allowRequest(`checkout-lead:${lead.id}`, 12, 3600))) return page("Muitas tentativas", "Aguarde alguns minutos e tente de novo.", 429);

  // Re-use a recent checkout so double taps do not create a pile of sessions on Whop.
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent } = await db()
    .from("checkouts")
    .select("purchase_url")
    .eq("lead_id", lead.id)
    .eq("plan", plan.key)
    .eq("via", "api")
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  let url = recent?.[0]?.purchase_url as string | undefined;
  let via: "api" | "static" | "reused" = "reused";

  if (!url) {
    try {
      const checkout = await createCheckout({
        plan: plan.key,
        leadId: lead.id,
        metadata: { telegram_user_id: lead.telegram_user_id ?? "", campaign: (lead.campaign ?? "").slice(0, 80) },
      });
      url = checkout.purchase_url;
      via = "api";
      await db().from("checkouts").insert({ lead_id: lead.id, plan: plan.key, whop_checkout_id: checkout.id, purchase_url: url, via });
    } catch (error) {
      // Never lose a buyer because of an API problem: fall back to the plain Whop checkout link.
      console.error("[checkout] falling back to static link:", error);
      try {
        url = staticCheckoutUrl(plan.key);
        via = "static";
        await db().from("checkouts").insert({ lead_id: lead.id, plan: plan.key, purchase_url: url, via });
        if (getEnv().WHOP_API_KEY && (await allowRequest("alert:checkout-api", 1, 3600))) {
          await notifyAdmin(`⚠️ Whop checkout API failed, using plain checkout links (payments will be matched by "recent checkout"): ${(error as Error).message.slice(0, 300)}`);
        }
      } catch (fallbackError) {
        console.error("[checkout]", fallbackError);
        await notifyAdmin(`🚨 Checkout is BROKEN for plan ${plan.key}: ${(fallbackError as Error).message.slice(0, 300)}`);
        return page("Pagamento indisponível", "Tivemos um problema para abrir o pagamento. Tente de novo em alguns minutos.", 502);
      }
    }
  }

  const first = !lead.checkout_started;
  await updateLead(lead.id, {
    checkout_started: true,
    checkout_started_at: new Date().toISOString(),
    last_checkout_plan: plan.key,
    ...(lead.vip_active ? {} : { stage: "CHECKOUT" as const }),
  });
  await setSystemSignal(lead.id, "clicked_vip_plan", `Clicked ${plan.key}`);
  await setSystemSignal(lead.id, "checkout_started", `Checkout opened (${via})`);
  await recordEvent(lead.id, "CHECKOUT_STARTED", { plan: plan.key, via });
  await recordMessage(lead.id, "event", `A pessoa abriu o pagamento do plano ${plan.name}.`);
  if (first) {
    await sendMetaEvent({ ...META_EVENTS.checkoutStarted, eventId: `checkout_${lead.id}`, lead, value: plan.price, currency: BUSINESS.currency, contentName: plan.name, contentId: plan.key });
  }

  return NextResponse.redirect(url!, 303);
}
