import Whop from "@whop/sdk";
import {
  getEnv,
} from "./env";
import {
  type VipPlanKey,
} from "@/src/config/agent";

let client: Whop | undefined;

export function whop() {
  if (client) return client;

  const env = getEnv();

  client = new Whop({
    apiKey: env.WHOP_COMPANY_API_KEY,
    webhookKey: Buffer
      .from(env.WHOP_WEBHOOK_SECRET)
      .toString("base64"),
  });

  return client;
}

export function getWhopPlanId(
  plan: VipPlanKey
) {
  const env = getEnv();

  switch (plan) {
    case "weekly":
      return env.WHOP_PLAN_WEEKLY;

    case "monthly":
      return env.WHOP_PLAN_MONTHLY;

    case "three_months":
      return env.WHOP_PLAN_3_MONTHS;

    default:
      throw new Error("Unknown Whop plan.");
  }
}

export function getPlanFromWhopPlanId(
  planId: string
): VipPlanKey | null {
  const env = getEnv();

  if (planId === env.WHOP_PLAN_WEEKLY)
    return "weekly";

  if (planId === env.WHOP_PLAN_MONTHLY)
    return "monthly";

  if (planId === env.WHOP_PLAN_3_MONTHS)
    return "three_months";

  return null;
}
