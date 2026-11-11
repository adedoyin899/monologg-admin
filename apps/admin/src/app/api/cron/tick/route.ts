import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function handleCronTick() {
  const apiUrl =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001";
  const cronSecret = process.env.CRON_SECRET || "monologg_cron_secret_alpha_2026";

  try {
    const res = await fetch(`${apiUrl}/api/v1/cron/admin-tick`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({}),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to forward cron tick to API", message: err.message },
      { status: 502 },
    );
  }
}

export async function GET() {
  return handleCronTick();
}

export async function POST() {
  return handleCronTick();
}

