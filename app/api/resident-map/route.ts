import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GeocodeResult = {
  lat: number;
  lng: number;
};

type NominatimCandidate = {
  lat: string;
  lon: string;
  display_name?: string;
  class?: string;
  type?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
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
  const normalized = address.replace(/\s+/g, " ").replace(/,\s*,/g, ",").trim();
  const lower = normalized.toLowerCase();
  const hasCityState =
    lower.includes("spring, tx") ||
    lower.includes("spring tx") ||
    lower.includes("texas") ||
    /\btx\b/.test(lower);

  const fallbackBase = normalized.split(",")[0]?.trim() || normalized;

  const streetMatch = fallbackBase.match(/^(\d+[a-zA-Z\-]?)\s+(.+)$/);
  const houseNumber = streetMatch?.[1]?.toLowerCase() || "";
  const streetName = streetMatch?.[2]?.toLowerCase().replace(/[^\w\s]/g, "").trim() || "";

  const queries = [
    normalized,
    ...(hasCityState
      ? []
      : [
          `${fallbackBase}, Spring, TX 77379`,
          `${fallbackBase}, Cypressdale, Spring, TX`,
          `${fallbackBase}, Harris County, TX`,
          `${fallbackBase}, Texas`,
        ]),
  ];

  const fetchCandidates = async (url: URL) => {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "cypressdalehoa-map/1.0",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) return [] as NominatimCandidate[];
    const data = (await res.json()) as NominatimCandidate[];
    return Array.isArray(data) ? data : [];
  };

  const allCandidates: NominatimCandidate[] = [];

  // Structured lookup first for better rooftop/house matching.
  if (streetMatch) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "us");
    url.searchParams.set("street", `${streetMatch[1]} ${streetMatch[2]}`);
    url.searchParams.set("city", "Spring");
    url.searchParams.set("state", "Texas");
    url.searchParams.set("postalcode", "77379");
    const candidates = await fetchCandidates(url);
    allCandidates.push(...candidates);
  }

  for (const q of queries) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "us");
    url.searchParams.set("q", q);
    const candidates = await fetchCandidates(url);
    allCandidates.push(...candidates);
  }

  if (!allCandidates.length) return null;

  const unique = new Map<string, NominatimCandidate>();
  for (const c of allCandidates) {
    const lat = Number(c.lat);
    const lng = Number(c.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    unique.set(`${lat.toFixed(7)},${lng.toFixed(7)}`, c);
  }

  const scored = Array.from(unique.values())
    .map((c) => {
      const addr = c.address || {};
      const road = (addr.road || "").toLowerCase().replace(/[^\w\s]/g, "").trim();
      const local = `${c.display_name || ""} ${(addr.city || addr.town || addr.village || "")} ${addr.state || ""}`.toLowerCase();
      let score = 0;

      if (houseNumber && (addr.house_number || "").toLowerCase() === houseNumber) score += 7;
      if (streetName && road && (road.includes(streetName) || streetName.includes(road))) score += 5;
      if (local.includes("spring")) score += 2;
      if (local.includes("texas") || local.includes(" tx")) score += 1;
      if ((addr.postcode || "").startsWith("77379")) score += 2;
      if (c.type === "house" || c.type === "residential") score += 1;

      return { c, score };
    })
    .sort((a, b) => b.score - a.score);

  const winner = scored[0]?.c;
  if (!winner) return null;

  const lat = Number(winner.lat);
  const lng = Number(winner.lon);
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
  const geo = await geocodeAddress(address);
  if (!geo) {
    return NextResponse.json(
      {
        error:
          "Could not place that address on the map. Enter street number and street name only (example: 1234 Cypressdale Dr).",
      },
      { status: 400 },
    );
  }

  const payload = {
    address,
    // Keep empty string when omitted to stay compatible with existing NOT NULL schemas.
    hours: hours || "",
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
