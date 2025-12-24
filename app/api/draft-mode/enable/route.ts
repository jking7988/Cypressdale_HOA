// app/api/draft-mode/enable/route.ts
import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

const PREVIEW_SECRET =
  process.env.SANITY_PREVIEW_SECRET ||
  "8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b";

function noContent() {
  return new NextResponse(null, { status: 204 });
}

// Sanity Presentation pings this route with HEAD to verify it exists
export async function HEAD() {
  return noContent();
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  // allow both ?redirect= and ?path= (different tools use different names)
  const redirect =
    url.searchParams.get("redirect") ||
    url.searchParams.get("path") ||
    "/";

  const secret = url.searchParams.get("secret");

  if (!secret || secret !== PREVIEW_SECRET) {
    return new NextResponse("Invalid secret", { status: 401 });
  }

  // Enable Draft Mode cookie
  (await draftMode()).enable();

  // Redirect back to the page that should show drafts
  return NextResponse.redirect(new URL(redirect, url.origin), 307);
}
