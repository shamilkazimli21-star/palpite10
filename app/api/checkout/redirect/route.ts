import { NextRequest, NextResponse } from "next/server";

import {
  getLeadById,
  setCriterion,
  updateLead,
} from "@/src/lib/lead";

import {
  type VipPlanKey,
} from "@/src/config/agent";

import {
  getWhopPlanId,
  whop,
} from "@/src/lib/whop";

import { getEnv } from "@/src/lib/env";

export const runtime = "nodejs";

const validPlans: VipPlanKey[] = [
  "weekly",
  "monthly",
  "three_months",
];

export async function GET(
  request: NextRequest
) {
  try {
    const leadId =
      request.nextUrl.searchParams.get(
        "lead"
      );

    const plan =
      request.nextUrl.searchParams.get(
        "plan"
      ) as VipPlanKey | null;

    if (!leadId || !plan) {
      return new NextResponse(
        "Missing checkout parameters.",
        { status: 400 }
      );
    }

    if (!validPlans.includes(plan)) {
      return new NextResponse(
        "Invalid plan.",
        { status: 400 }
      );
    }

    const lead =
      await getLeadById(leadId);

    if (!lead) {
      return new NextResponse(
        "Lead not found.",
        { status: 404 }
      );
    }

    await setCriterion(
      lead.id,
      "clicks_vip_link",
      1,
      `User clicked the ${plan} VIP option.`
    );

    await setCriterion(
      lead.id,
      "checkout_started",
      1,
      `Whop checkout was requested for ${plan}.`
    );

    await updateLead(lead.id, {
      stage: "CHECKOUT",
      checkout_started: true,
      last_checkout_plan: plan,
    });

    const env = getEnv();

    const checkout =
      await whop().checkoutConfigurations.create(
        {
          plan_id: getWhopPlanId(plan),
          mode: "payment",

          metadata: {
            lead_id: lead.id,
            plan_key: plan,
            source: "telegram",
          },

          redirect_url:
            `${env.APP_URL}/complete`,
        }
      );

    const purchaseUrl =
      (checkout as any).purchase_url;

    if (!purchaseUrl) {
      throw new Error(
        "Whop did not return purchase_url."
      );
    }

    return NextResponse.redirect(
      purchaseUrl,
      303
    );
  } catch (error) {
    console.error(
      "[checkout redirect]",
      error
    );

    return new NextResponse(
      "Could not create checkout.",
      { status: 500 }
    );
  }
}
