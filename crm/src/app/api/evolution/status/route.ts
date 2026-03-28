import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.EVOLUTION_API_URL!.replace(/\/+$/, "");
  const instanceName = process.env.EVOLUTION_INSTANCE!;
  const encodedInstance = encodeURIComponent(instanceName);

  try {
    const res = await fetch(
      `${baseUrl}/instance/connectionState/${encodedInstance}`,
      { headers: { apikey: process.env.EVOLUTION_API_KEY! } }
    );

    if (!res.ok) {
      return NextResponse.json({ connected: false });
    }

    const data = await res.json();
    const connected = data?.instance?.state === "open";

    return NextResponse.json({
      connected,
      ...(connected && data?.instance?.phoneNumber
        ? { number: data.instance.phoneNumber }
        : {}),
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
