// app/api/draft-mode/disable/route.ts
import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

function noContent() {
  return new NextResponse(null, { status: 204 });
}

export async function HEAD() {
  return noContent();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") || "/";

  (await draftMode()).disable();

  return NextResponse.redirect(new URL(redirect, url.origin), 307);
}
