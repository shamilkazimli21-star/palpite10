import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "PALPITE10",
    timestamp:
      new Date().toISOString(),
  });
}
