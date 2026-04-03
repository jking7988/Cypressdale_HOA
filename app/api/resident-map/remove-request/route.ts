import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isYardSaleMapActive } from "@/lib/yardSale";

const resendApiKey = process.env.RESEND_API_KEY || "";
const notifyTo = process.env.RESIDENT_MAP_NOTIFY_TO || "joshking7988@gmail.com";

function sanitizeString(input: unknown, maxLength: number) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

export async function POST(req: Request) {
  if (!isYardSaleMapActive) {
    return NextResponse.json(
      { error: "Yard sale map is currently closed." },
      { status: 403 },
    );
  }

  if (!resendApiKey) {
    return NextResponse.json(
      { error: "Email notification service is not configured." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const address = sanitizeString((body as any)?.address, 180);
  if (!address) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }

  const resend = new Resend(resendApiKey);
  const subject = "Resident pin removal request";
  const text = `Pin removal requested for address: ${address}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0b1f18">
      <h2 style="margin:0 0 10px">Resident pin removal request</h2>
      <p style="margin:0 0 6px"><strong>Address:</strong> ${address}</p>
      <p style="margin:12px 0 0;font-size:12px;color:#475569">This request was submitted from the public map form.</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "Cypressdale HOA <no-reply@cypressdalehoa.com>",
      to: notifyTo,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("resident-map remove-request email error:", err);
    return NextResponse.json(
      { error: "Could not send request notification." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
