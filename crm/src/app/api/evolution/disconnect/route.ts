import { NextResponse } from "next/server";

export async function POST() {
  const baseUrl = process.env.EVOLUTION_API_URL!.replace(/\/+$/, "");
  const instanceName = process.env.EVOLUTION_INSTANCE!;
  const encodedInstance = encodeURIComponent(instanceName);

  try {
    await fetch(
      `${baseUrl}/instance/logout/${encodedInstance}`,
      {
        method: "DELETE",
        headers: { apikey: process.env.EVOLUTION_API_KEY! },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
