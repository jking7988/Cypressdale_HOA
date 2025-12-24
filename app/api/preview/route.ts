// app/api/preview/route.ts
// @ts-nocheck
import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

const PREVIEW_SECRET =
  process.env.SANITY_PREVIEW_SECRET ||
  "8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const secret = searchParams.get("secret");
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!secret || secret !== PREVIEW_SECRET) {
    return new NextResponse("Invalid secret", { status: 401 });
  }

  if (!type || !id) {
    return new NextResponse("Missing id/type", { status: 400 });
  }

  // ✅ This is what actually turns on draft previews
  draftMode().enable();

  let path: string;

  if (type === "post") {
    path = `/news/${id}?draft=1`;
  } else if (type === "event") {
    path = `/events/${id}?draft=1`;
  } else if (type === "holidayWinner") {
    // ✅ IMPORTANT: send to the holiday page (not "/")
    path = `/holiday-decorating?draft=1&id=${id}`;
  } else {
    return new NextResponse(`Unsupported type: ${type}`, { status: 400 });
  }

  return NextResponse.redirect(new URL(path, request.url), 307);
}
