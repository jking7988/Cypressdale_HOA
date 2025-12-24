import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

const PREVIEW_SECRET =
  process.env.SANITY_PREVIEW_SECRET ||
  "8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b";

function okNoContent() {
  return new NextResponse(null, { status: 204 });
}

export async function HEAD() {
  // presentation does HEAD checks sometimes
  return okNoContent();
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const secret = url.searchParams.get("secret");
  const redirect = url.searchParams.get("redirect") || "/";

  if (!secret || secret !== PREVIEW_SECRET) {
    return new NextResponse("Invalid secret", { status: 401 });
  }

  (await draftMode()).enable();

  return NextResponse.redirect(new URL(redirect, url.origin), 307);
}
