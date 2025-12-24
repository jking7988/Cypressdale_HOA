import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

function okNoContent() {
  return new NextResponse(null, { status: 204 });
}

export async function HEAD() {
  return okNoContent();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") || "/";

  (await draftMode()).disable();

  return NextResponse.redirect(new URL(redirect, url.origin), 307);
}
