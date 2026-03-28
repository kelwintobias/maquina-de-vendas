import { NextResponse } from "next/server";

export async function POST() {
  const baseUrl = process.env.EVOLUTION_API_URL!.replace(/\/+$/, "");
  const instanceName = process.env.EVOLUTION_INSTANCE!;
  const encodedInstance = encodeURIComponent(instanceName);
  const headers = {
    apikey: process.env.EVOLUTION_API_KEY!,
    "Content-Type": "application/json",
  };

  try {
    // First try: connect existing instance to get QR code
    const connectRes = await fetch(
      `${baseUrl}/instance/connect/${encodedInstance}`,
      { method: "GET", headers }
    );

    if (connectRes.ok) {
      const data = await connectRes.json();
      const qr = data.base64 ?? data.qrcode?.base64 ?? "";
      if (qr) {
        return NextResponse.json({ qrcode: qr });
      }
      // Instance exists but already connected — no QR needed
      return NextResponse.json({ connected: true });
    }

    // If 404, instance doesn't exist — create it with qrcode: true
    if (connectRes.status === 404) {
      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error("[evolution/connect] create failed:", err);
        return NextResponse.json({ error: err }, { status: createRes.status });
      }

      const data = await createRes.json();
      const qr = data.qrcode?.base64 ?? data.base64 ?? "";
      return NextResponse.json({ qrcode: qr });
    }

    const err = await connectRes.text();
    console.error("[evolution/connect] connect failed:", err);
    return NextResponse.json({ error: err }, { status: connectRes.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[evolution/connect] exception:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
