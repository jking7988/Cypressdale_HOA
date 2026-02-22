import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GeocodeResult = {
  lat: number;
  lng: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabaseConfig = Boolean(supabaseUrl && serviceRoleKey);

const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl as string, serviceRoleKey as string)
  : null;

function sanitizeString(input: unknown, maxLength: number) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = `${address}, Cypressdale, Spring, TX`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "cypressdalehoa-map/1.0",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

export async function GET() {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured for resident map." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("resident_map_entries")
    .select("id,address,hours,details,lat,lng,created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    console.error("resident-map GET error:", error);
    return NextResponse.json(
      { error: "Could not load map entries." },
      { status: 500 },
    );
  }

  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured for resident map." },
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
  const hours = sanitizeString((body as any)?.hours, 120);
  const details = sanitizeString((body as any)?.details, 1000);

  if (!address) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }
  if (!hours) {
    return NextResponse.json({ error: "Hours are required." }, { status: 400 });
  }

  const geo = await geocodeAddress(address);
  if (!geo) {
    return NextResponse.json(
      {
        error:
          "Could not place that address on the map. Please use a more complete address.",
      },
      { status: 400 },
    );
  }

  const payload = {
    address,
    hours,
    details: details || null,
    lat: geo.lat,
    lng: geo.lng,
  };

  const { data, error } = await supabase
    .from("resident_map_entries")
    .insert([payload])
    .select("id,address,hours,details,lat,lng,created_at")
    .single();

  if (error) {
    console.error("resident-map POST error:", error);
    return NextResponse.json(
      { error: "Could not save this map pin right now." },
      { status: 500 },
    );
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured for resident map." },
      { status: 500 },
    );
  }

  const expectedSecret =
    process.env.RESIDENT_MAP_DELETE_SECRET || process.env.NEWS_DELETE_SECRET || "";
  const providedSecret = req.headers.get("x-delete-secret") || "";

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get("id"), 80);
  if (!id) {
    return NextResponse.json({ error: "Pin id is required." }, { status: 400 });
  }

  const { error } = await supabase.from("resident_map_entries").delete().eq("id", id);
  if (error) {
    console.error("resident-map DELETE error:", error);
    return NextResponse.json({ error: "Could not delete pin." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
