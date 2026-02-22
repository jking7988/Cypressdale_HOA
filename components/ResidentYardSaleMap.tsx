"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ResidentMapEntry = {
  id: string;
  address: string;
  hours: string;
  details?: string | null;
  lat: number;
  lng: number;
  created_at?: string;
};

type LeafletLike = {
  map: (el: HTMLElement) => any;
  tileLayer: (url: string, opts: Record<string, unknown>) => any;
  layerGroup: () => any;
  marker: (latLng: [number, number]) => any;
};

type ResidentYardSaleMapProps = {
  readOnly?: boolean;
  showQrCard?: boolean;
  mapPath?: string;
  title?: string;
  subtitle?: string;
};

const CENTER: [number, number] = [30.0376, -95.4798];
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

declare global {
  interface Window {
    L?: LeafletLike;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function popupHtml(entry: ResidentMapEntry) {
  const details = entry.details ? `<div style="margin-top:6px">${escapeHtml(entry.details)}</div>` : "";
  const hoursLine = entry.hours ? `<div><strong>Hours:</strong> ${escapeHtml(entry.hours)}</div>` : "";
  const encodedAddress = encodeURIComponent(entry.address);
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  const appleUrl = `https://maps.apple.com/?q=${encodedAddress}`;
  return `
    <div style="min-width:220px;font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0b1f18">
      <div style="font-weight:700;margin-bottom:4px">${escapeHtml(entry.address)}</div>
      ${hoursLine}
      ${details}
      <div style="display:flex;gap:8px;margin-top:8px">
        <a href="${googleUrl}" target="_blank" rel="noreferrer" style="color:#0369a1;text-decoration:underline">Google Maps</a>
        <a href="${appleUrl}" target="_blank" rel="noreferrer" style="color:#0f766e;text-decoration:underline">Apple Maps</a>
      </div>
    </div>
  `;
}

function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function appleMapsUrl(address: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
}

async function ensureLeafletLoaded() {
  if (typeof window === "undefined") return null;
  if (window.L) return window.L;

  const existingCss = document.querySelector(`link[href="${LEAFLET_CSS}"]`);
  if (!existingCss) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing && window.L) {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Leaflet failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.body.appendChild(script);
  });

  return window.L ?? null;
}

export default function ResidentYardSaleMap({
  readOnly = false,
  showQrCard = false,
  mapPath = "/map",
  title = "Community Yard Sale Map",
  subtitle = "Add your pin with address, hours, and optional notes.",
}: ResidentYardSaleMapProps) {
  const [entries, setEntries] = useState<ResidentMapEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [shareMsg, setShareMsg] = useState<string>("");

  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [details, setDetails] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const pinLayerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoadingEntries(true);
      setError("");
      try {
        const res = await fetch("/api/resident-map", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Failed to load map entries.");
        }
        if (isMounted) {
          setEntries(Array.isArray(json.entries) ? json.entries : []);
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || "Failed to load map entries.");
      } finally {
        if (isMounted) setLoadingEntries(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShareUrl(`${window.location.origin}${mapPath}`);
  }, [mapPath]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapHostRef.current || mapRef.current) return;
      const L = await ensureLeafletLoaded();
      if (!L || cancelled || !mapHostRef.current) return;

      const map = L.map(mapHostRef.current);
      map.setView(CENTER, 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      pinLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        pinLayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!window.L || !mapRef.current || !pinLayerRef.current) return;
    const L = window.L;
    const map = mapRef.current;
    const layer = pinLayerRef.current;

    layer.clearLayers();
    const valid = entries.filter(
      (e) => Number.isFinite(Number(e.lat)) && Number.isFinite(Number(e.lng)),
    );

    valid.forEach((entry) => {
      const marker = L.marker([Number(entry.lat), Number(entry.lng)]);
      const tooltip = entry.hours ? `${entry.address} | ${entry.hours}` : entry.address;
      marker.bindTooltip(tooltip, { direction: "top" });
      marker.bindPopup(popupHtml(entry));
      marker.addTo(layer);
    });

    if (valid.length > 0) {
      const bounds = valid.map((e) => [Number(e.lat), Number(e.lng)] as [number, number]);
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 });
    } else {
      map.setView(CENTER, 15);
    }
  }, [entries]);

  const canSubmit = useMemo(() => !!address.trim() && !isSubmitting, [address, isSubmitting]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/resident-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.trim(),
          hours: hours.trim(),
          details: details.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Could not submit pin.");
      }

      if (json?.entry) {
        setEntries((prev) => [json.entry, ...prev]);
      }
      setAddress("");
      setHours("");
      setDetails("");
      setSuccess("Pin added to map.");
    } catch (err: any) {
      setError(err?.message || "Could not submit pin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDeletePin(id: string) {
    setError("");
    setSuccess("");

    const passphrase = window.prompt("Enter admin passphrase to remove this pin:");
    if (!passphrase) return;

    try {
      const res = await fetch(`/api/resident-map?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-delete-secret": passphrase },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Could not delete pin.");
      }

      setEntries((prev) => prev.filter((p) => p.id !== id));
      setSuccess("Pin removed.");
    } catch (err: any) {
      setError(err?.message || "Could not delete pin.");
    }
  }

  async function onShareMap() {
    if (!shareUrl) return;
    setError("");
    setShareMsg("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Community Yard Sale Map",
          text: "Open the community map with all sale addresses.",
          url: shareUrl,
        });
        setShareMsg("Shared successfully.");
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }

    // Fallback path for browsers where share exists but fails, or share is unavailable.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMsg("Share not available on this device. Map link copied.");
        return;
      }
    } catch {
      // continue to manual fallback
    }

    window.prompt("Copy this map link:", shareUrl);
    setShareMsg("Share not available on this device. Copy link shown.");
  }

  async function onCopyMapLink() {
    if (!shareUrl) return;
    setError("");
    setShareMsg("");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMsg("Map link copied.");
    } catch {
      setError("Could not copy link.");
    }
  }

  const qrImageUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`
    : "";

  return (
    <section className="rounded-3xl bg-white/95 border border-emerald-50 shadow-[0_18px_50px_rgba(15,118,110,0.22)] backdrop-blur px-4 py-5 md:px-6 md:py-6 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h2">{title}</h2>
        <p className="text-xs text-gray-600">{subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-stretch">
        <div className="rounded-2xl overflow-hidden border border-emerald-100 shadow-sm min-h-[360px] md:min-h-[520px] h-full">
          <div ref={mapHostRef} className="h-full w-full min-h-[360px] md:min-h-[520px] bg-emerald-50" />
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
          {!readOnly ? (
            <>
              <h3 className="text-sm font-semibold text-emerald-900 mb-2">Add your sale pin</h3>

              <form onSubmit={onSubmit} className="space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-emerald-900">Address</span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="1234 Cypressdale Dr, Spring, TX"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-emerald-900">Hours (optional)</span>
                  <input
                    type="text"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="Sat 8:00 AM - 2:00 PM"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-emerald-900">Details (optional)</span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 min-h-[90px]"
                    placeholder="Furniture, kids clothes, tools, etc."
                  />
                </label>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-3 py-2"
                >
                  {isSubmitting ? "Submitting..." : "Submit pin"}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-900">Use a pin for details</h3>
              <p className="text-xs text-gray-700">
                Tap any pin to view hours and optional notes, then export that address to Google or Apple Maps.
              </p>
            </div>
          )}

          {loadingEntries && <p className="mt-3 text-xs text-gray-600">Loading map pins...</p>}
          {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
          {!error && success && <p className="mt-3 text-xs text-emerald-700">{success}</p>}

          {showQrCard && qrImageUrl && (
            <div className="mt-4 border-t border-emerald-100 pt-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-900">Share this map</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="QR code linking to community yard sale map page"
                className="h-36 w-36 rounded-lg border border-emerald-200 bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onShareMap}
                  className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-800"
                >
                  Share QR/Link
                </button>
                <button
                  type="button"
                  onClick={onCopyMapLink}
                  className="rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  Copy link
                </button>
                <a
                  href={qrImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download="cypressdale-yard-sale-map-qr.png"
                  className="rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  Save QR
                </a>
              </div>
              {shareMsg && <p className="text-xs text-emerald-700">{shareMsg}</p>}
              <a
                href={shareUrl}
                className="inline-flex text-xs text-emerald-700 hover:underline break-all"
              >
                {shareUrl}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-2">Address list</h3>
        {entries.length === 0 ? (
          <p className="text-xs text-gray-600">No addresses have been pinned yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                <p className="text-sm font-semibold text-emerald-950">{entry.address}</p>
                {entry.hours && (
                  <p className="text-xs text-gray-700 mt-0.5">
                    <span className="font-semibold">Hours:</span> {entry.hours}
                  </p>
                )}
                {entry.details && <p className="text-xs text-gray-700 mt-1">{entry.details}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <a
                    href={googleMapsUrl(entry.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-700 hover:underline"
                  >
                    Open in Google Maps
                  </a>
                  <a
                    href={appleMapsUrl(entry.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline"
                  >
                    Open in Apple Maps
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onDeletePin(entry.id)}
                      className="text-red-700 hover:underline"
                    >
                      Remove pin
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
