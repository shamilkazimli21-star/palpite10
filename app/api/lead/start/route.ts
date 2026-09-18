import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/src/lib/lead";
import { getEnv } from "@/src/lib/env";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const env = getEnv();

    const body = await request.json();

    const landingUrl =
      typeof body.landingUrl === "string"
        ? body.landingUrl
        : env.APP_URL;

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(landingUrl);
    } catch {
      parsedUrl = new URL(env.APP_URL);
    }

    const fbc =
      request.cookies.get("_fbc")?.value ??
      null;

    const fbp =
      request.cookies.get("_fbp")?.value ??
      null;

    const lead = await createLead({
      source:
        parsedUrl.searchParams.get("utm_source"),
      campaign:
        parsedUrl.searchParams.get("utm_campaign"),
      adId:
        parsedUrl.searchParams.get("utm_content"),
      fbclid:
        parsedUrl.searchParams.get("fbclid"),
      fbc,
      fbp,
      userAgent:
        request.headers.get("user-agent"),
      landingUrl,
    });

    const telegramUrl =
      `https://t.me/${env.TELEGRAM_BOT_USERNAME}` +
      `?start=${lead.id}`;

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      telegramUrl,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not create lead.",
      },
      { status: 500 }
    );
  }
}
