import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  setTelegramWebhook,
} from "@/src/lib/telegram";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  const setupSecret =
    process.env.SETUP_SECRET;

  if (!setupSecret) {
    return NextResponse.json(
      {
        error:
          "SETUP_SECRET is not configured.",
      },
      { status: 500 }
    );
  }

  const supplied =
    request.headers.get(
      "x-setup-secret"
    );

  if (
    supplied !== setupSecret
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  await setTelegramWebhook();

  return NextResponse.json({
    success: true,
    webhook:
      `${process.env.APP_URL}/api/telegram/webhook`,
  });
}
