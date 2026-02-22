// app/(site)/events/[id]/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { groq, stegaClean } from "next-sanity";
import React from "react";
import { sanityFetch } from "@/lib/live";
import { PortableText } from "@portabletext/react";
import { normalizePortableTextValue, portableTextComponents } from "@/components/portableTextComponents";
import { NewsLetterSignup } from "@/components/NewsLetterSignup";
import { CalendarDays, MapPin, Users, FileText } from "lucide-react";

const eventByIdQuery = groq`
  *[_type == "event" && (_id == $id || _id == $draftId)]
  | order(_id desc)[0]{
    _id,
    title,
    description,
    excerpt,
    body,
    location,
    startDate,
    endDate,
    isMultiDayEvent,
    secondStartDate,
    secondEndDate,
    layoutVariant,
    showRightSidebar,
    sections[]{
      ...,
      _type == "imageWithText" => {
        ...,
        "imageUrl": image.asset->url,
        "imageAlt": coalesce(image.alt, "")
      },
      _type == "topicSection" => {
        ...,
        "backgroundImageUrl": backgroundImage.asset->url
      }
    },
    rsvpYes,
    rsvpMaybe,
    "flyerUrl": flyer.asset->url,
    "flyerMime": flyer.asset->mimeType,
    "flyerName": flyer.asset->originalFilename
  }
`;

type Event = {
  _id: string;
  title: string;
  description?: string;
  excerpt?: any;
  body?: any;
  location?: string;
  startDate?: string;
  endDate?: string;
  isMultiDayEvent?: boolean;
  secondStartDate?: string;
  secondEndDate?: string;
  layoutVariant?: "standard" | "narrow" | "wide";
  showRightSidebar?: boolean;
  sections?: any[];
  rsvpYes?: number;
  rsvpMaybe?: number;
  flyerUrl?: string;
  flyerMime?: string;
  flyerName?: string;
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type SectionWidth = "default" | "narrow" | "wide" | "full" | undefined;
type SectionSpacing = "tight" | "normal" | "spacious" | undefined;
type SectionBorder = "none" | "subtle" | "strong" | undefined;
type SectionBorderThickness = "thin" | "medium" | "thick" | undefined;
type ColorField = { hex?: string };

type BaseSection = {
  backgroundColor?: ColorField;
  backgroundColorEnd?: ColorField;
  gradientDirection?: string;
  borderColor?: ColorField;
  titleColor?: ColorField;
  titleSize?: number | string;
  titleWeight?: number | string;
  backgroundImageUrl?: string;
  backgroundImageOpacity?: number;
};

function sectionWidthClasses(width: SectionWidth) {
  const value = width ? stegaClean(width).trim().toLowerCase() : "default";
  switch (value) {
    case "narrow":
      return "max-w-xl mx-auto";
    case "wide":
      return "max-w-5xl mx-auto";
    case "full":
      return "mx-[-1rem] md:mx-[-2rem]";
    default:
      return "";
  }
}

function sectionSpacingClasses(spacing: SectionSpacing) {
  const value = spacing ? stegaClean(spacing).trim().toLowerCase() : "normal";
  switch (value) {
    case "tight":
      return "py-2 md:py-3";
    case "spacious":
      return "py-6 md:py-8";
    default:
      return "py-4 md:py-5";
  }
}

function sectionBorderClasses(border: SectionBorder, thickness: SectionBorderThickness) {
  const borderValue = border ? stegaClean(border).trim().toLowerCase() : "subtle";
  if (borderValue === "none") return "border-none shadow-none";

  const thicknessValue = thickness ? stegaClean(thickness).trim().toLowerCase() : "thin";
  const widthClass =
    thicknessValue === "thick" ? "border-4" : thicknessValue === "medium" ? "border-2" : "border";
  const shadowClass = borderValue === "strong" ? "shadow-md" : "shadow-sm";
  return `${widthClass} ${shadowClass}`;
}

function resolveGradientDirection(direction?: string) {
  const value = direction ? stegaClean(direction).trim().toLowerCase() : "";
  if (!value) return "to bottom";

  const directionMap: Record<string, string> = {
    "to bottom": "to bottom",
    vertical: "to bottom",
    "top to bottom": "to bottom",
    "to right": "to right",
    horizontal: "to right",
    "left to right": "to right",
    "to top": "to top",
    "bottom to top": "to top",
    "to left": "to left",
    "right to left": "to left",
  };

  return directionMap[value] || value;
}

function buildSectionStyle(section: BaseSection): React.CSSProperties {
  const style: React.CSSProperties = {};

  const bg = section.backgroundColor?.hex ? stegaClean(section.backgroundColor.hex) : undefined;
  const bgEnd = section.backgroundColorEnd?.hex
    ? stegaClean(section.backgroundColorEnd.hex)
    : undefined;
  const dir = resolveGradientDirection(section.gradientDirection);

  if (bg && bgEnd) {
    style.backgroundImage = `linear-gradient(${dir}, ${bg}, ${bgEnd})`;
  } else if (bg) {
    style.backgroundColor = bg;
  }

  if (section.borderColor?.hex) {
    style.borderColor = stegaClean(section.borderColor.hex);
  }

  if (section.backgroundImageUrl) {
    const opacity = section.backgroundImageOpacity ?? 0.18;
    style.backgroundImage = [
      style.backgroundImage,
      `linear-gradient(rgba(255,255,255,${1 - opacity}), rgba(255,255,255,${1 - opacity}))`,
      `url(${section.backgroundImageUrl})`,
    ]
      .filter(Boolean)
      .join(", ");
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }

  return style;
}

function sectionTextAlign(alignment?: string): React.CSSProperties {
  const value = alignment ? stegaClean(alignment).trim().toLowerCase() : "left";
  if (value === "center") return { textAlign: "center" };
  if (value === "right") return { textAlign: "right" };
  return { textAlign: "left" };
}

function sectionTitleStyle(section: BaseSection): React.CSSProperties {
  const color = section.titleColor?.hex ? stegaClean(section.titleColor.hex) : "";
  const sizeMap: Record<string, number> = { sm: 18, md: 20, lg: 24, xl: 30 };
  const weightMap: Record<string, number> = { medium: 500, semibold: 600, bold: 700, extrabold: 800 };

  let size = 20;
  if (typeof section.titleSize === "number" && Number.isFinite(section.titleSize)) {
    size = section.titleSize;
  } else if (typeof section.titleSize === "string") {
    const clean = stegaClean(section.titleSize).trim().toLowerCase();
    const parsed = Number(clean);
    size = Number.isFinite(parsed) ? parsed : (sizeMap[clean] ?? 20);
  }

  let weight = 600;
  if (typeof section.titleWeight === "number" && Number.isFinite(section.titleWeight)) {
    weight = section.titleWeight;
  } else if (typeof section.titleWeight === "string") {
    const clean = stegaClean(section.titleWeight).trim().toLowerCase();
    const parsed = Number(clean);
    weight = Number.isFinite(parsed) ? parsed : (weightMap[clean] ?? 600);
  }

  const clampedSize = Math.min(64, Math.max(12, size));
  const clampedWeight = Math.min(900, Math.max(100, weight));
  return { ...(color ? { color } : {}), fontSize: `${clampedSize}px`, fontWeight: clampedWeight };
}

function sectionTextAlignClass(alignment?: string) {
  const value = alignment ? stegaClean(alignment).trim().toLowerCase() : "left";
  if (value === "center") {
    return "[&_p]:text-center [&_h1]:text-center [&_h2]:text-center [&_h3]:text-center [&_li]:text-center [&_ul]:ml-0 [&_ol]:ml-0 [&_ul]:list-inside [&_ol]:list-inside";
  }
  if (value === "right") {
    return "[&_p]:text-right [&_h1]:text-right [&_h2]:text-right [&_h3]:text-right [&_li]:text-right [&_ul]:ml-0 [&_ol]:ml-0 [&_ul]:list-inside [&_ol]:list-inside";
  }
  return "[&_p]:text-left [&_h1]:text-left [&_h2]:text-left [&_h3]:text-left [&_li]:text-left";
}

function topicLabelJustifyClass(alignment?: string) {
  const value = alignment ? stegaClean(alignment).trim().toLowerCase() : "left";
  if (value === "center") return "justify-center";
  if (value === "right") return "justify-end";
  return "justify-start";
}

function formatTimeOnly(dateStr: string, timeZone = "America/Chicago") {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

type DayScheduleEntry = {
  dateKey: string;
  label: string;
  hours: string;
  sourcePriority: number;
};

function dateKeyInTz(dateStr: string, timeZone = "America/Chicago") {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatDateKeyLabel(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function nextDateKey(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function buildRangeDayCards(
  start?: string,
  end?: string,
  sourcePriority = 1,
  timeZone = "America/Chicago",
): DayScheduleEntry[] {
  if (!start) return [];
  const startKey = dateKeyInTz(start, timeZone);
  if (!startKey) return [];

  const normalizedEnd = end || start;
  const endKey = dateKeyInTz(normalizedEnd, timeZone) || startKey;
  const startTime = formatTimeOnly(start, timeZone);
  const endTime = formatTimeOnly(normalizedEnd, timeZone);

  const cards: DayScheduleEntry[] = [];
  let currentKey = startKey;

  while (currentKey) {
    const isStartDay = currentKey === startKey;
    const isEndDay = currentKey === endKey;
    let hours = "All day";

    if (isStartDay && isEndDay) {
      hours = `${startTime} - ${endTime}`;
    } else if (isStartDay) {
      hours = `${startTime} - 11:59 PM`;
    } else if (isEndDay) {
      hours = `12:00 AM - ${endTime}`;
    }

    cards.push({
      dateKey: currentKey,
      label: formatDateKeyLabel(currentKey),
      hours,
      sourcePriority,
    });

    if (currentKey === endKey) break;
    currentKey = nextDateKey(currentKey);
  }

  return cards;
}

export default async function EventDetailPage(props: Props) {
  const { id } = await props.params;
  if (!id) return notFound();

  const draftId = `drafts.${id}`;

  const { data } = await sanityFetch({
    query: eventByIdQuery,
    params: { id, draftId },
    stega: true,
  });
  const event = data as Event | null;
  if (!event) return notFound();

  const goingCount = event.rsvpYes ?? 0;
  const maybeCount = event.rsvpMaybe ?? 0;

  const hasStart = !!event.startDate && !Number.isNaN(new Date(event.startDate).getTime());
  const hasSecondStart =
    !!event.secondStartDate && !Number.isNaN(new Date(event.secondStartDate).getTime());
  const scheduleMap = new Map<string, DayScheduleEntry>();
  const primaryCards = buildRangeDayCards(event.startDate, event.endDate, 1);
  const secondaryCards =
    event.isMultiDayEvent && hasSecondStart
      ? buildRangeDayCards(event.secondStartDate, event.secondEndDate, 2)
      : [];
  for (const card of [...primaryCards, ...secondaryCards]) {
    const existing = scheduleMap.get(card.dateKey);
    if (!existing || card.sourcePriority >= existing.sourcePriority) {
      scheduleMap.set(card.dateKey, card);
    }
  }
  const scheduleCards = Array.from(scheduleMap.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );

  const layout = event.layoutVariant || "standard";
  const widthClass =
    layout === "narrow" ? "max-w-2xl" : layout === "wide" ? "max-w-5xl" : "max-w-4xl";
  const showRightSidebar = event.showRightSidebar ?? true;
  const pageWidthClass = showRightSidebar ? "max-w-6xl" : widthClass;

  return (
    <div className="relative min-h-[calc(100vh-5rem)] bg-gradient-to-b from-emerald-50 via-sky-50 to-emerald-50">
      <div className="pointer-events-none fixed inset-0 opacity-40 mix-blend-multiply">
        <div className="absolute -top-12 -left-10 h-40 w-40 rounded-full bg-emerald-200 blur-3xl" />
        <div className="absolute top-24 -right-10 h-36 w-36 rounded-full bg-sky-200 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-lime-200 blur-3xl" />
      </div>

      <div className={`relative mx-auto px-4 py-10 space-y-4 ${pageWidthClass}`}>
        <div className="mb-1">
          <Link
            href="/events"
            className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-900 hover:underline"
          >
            <span>{"<-"}</span>
            <span>Back to all events</span>
          </Link>
        </div>

        <section className={showRightSidebar ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start" : ""}>
        <article className="rounded-3xl bg-white/95 border border-emerald-100 shadow-[0_20px_50px_rgba(15,118,110,0.2)] backdrop-blur-sm px-5 py-6 md:px-8 md:py-7 space-y-6">
          <header className="space-y-3 border-b border-emerald-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/90 px-3 py-1 text-[11px] font-semibold text-emerald-50 uppercase tracking-[0.18em] shadow-sm">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Community Event</span>
                </div>
                <h1 className="text-xl md:text-2xl font-semibold leading-snug text-emerald-950">{event.title}</h1>
              </div>

              <div className="flex flex-col items-start md:items-end gap-1 text-[11px] md:text-xs">
                {!hasStart || scheduleCards.length === 0 ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-emerald-900">
                    <CalendarDays className="h-3.5 w-3.5 text-emerald-700" />
                    <span className="font-medium">Date TBA</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {scheduleCards.map((card) => (
                      <div
                        key={card.dateKey}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-emerald-900"
                      >
                        <CalendarDays className="h-3.5 w-3.5 text-emerald-700" />
                        <span className="font-medium">
                          {card.label}, {card.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {event.location && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-100 px-3 py-1 text-sky-900">
                    <MapPin className="h-3.5 w-3.5 text-sky-700" />
                    <span className="font-medium">{event.location}</span>
                  </div>
                )}

                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-emerald-900">
                  <Users className="h-3.5 w-3.5 text-emerald-700" />
                  <span>
                    <span className="font-semibold">{goingCount}</span> going | <span className="font-semibold">{maybeCount}</span> maybe
                  </span>
                </div>
              </div>
            </div>
          </header>

          {event.flyerUrl && (
            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-semibold text-emerald-950 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-700" />
                <span>Event flyer</span>
              </h2>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 shadow-sm p-3">
                {event.flyerMime?.startsWith("image/") ? (
                  <div className="relative w-full max-h-[600px] overflow-hidden rounded-xl bg-emerald-900/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.flyerUrl}
                      alt={event.flyerName || `${event.title} flyer`}
                      className="w-full h-full object-contain transition-transform duration-200 hover:scale-[1.02]"
                    />
                  </div>
                ) : event.flyerMime === "application/pdf" ? (
                  <div className="space-y-2">
                    <div className="rounded-xl overflow-hidden border border-emerald-100 bg-white">
                      <iframe src={event.flyerUrl} title={event.flyerName || `${event.title} flyer`} className="w-full h-[600px]" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900/80">
                      <span>{event.flyerName || "Event flyer"} (PDF)</span>
                      <a
                        href={event.flyerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        <span>Open in new tab</span>
                        <span>{"->"}</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-xs text-emerald-900/85">
                    <span>{event.flyerName ? `Event file: ${event.flyerName}` : "Event file"}</span>
                    <a
                      href={event.flyerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      <span>View file</span>
                      <span>{"->"}</span>
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {event.sections && event.sections.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-emerald-50">
              {event.sections.map((section: any, idx: number) => {
                switch (section._type) {
                  case "textSection": {
                    const wrapperClasses = [
                      sectionWidthClasses(section.width as SectionWidth),
                      "rounded-2xl px-4 md:px-6 mt-2",
                      sectionSpacingClasses(section.spacing as SectionSpacing),
                      sectionBorderClasses(section.borderStyle as SectionBorder, section.borderThickness as SectionBorderThickness),
                      sectionTextAlignClass(section.alignment),
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const alignedStyle = { ...buildSectionStyle(section), ...sectionTextAlign(section.alignment) };

                    return (
                      <section key={idx} className={wrapperClasses} style={alignedStyle}>
                        {section.title && (
                          <h2 className="text-emerald-900 mb-2 leading-tight" style={sectionTitleStyle(section)}>
                            {section.title}
                          </h2>
                        )}
                        {section.body && (
                          <div
                            className={`text-sm md:text-[15px] leading-relaxed text-gray-800 space-y-3 ${sectionTextAlignClass(section.alignment)}`}
                          >
                            <PortableText value={normalizePortableTextValue(section.body)} components={portableTextComponents} />
                          </div>
                        )}
                      </section>
                    );
                  }

                  case "imageWithText": {
                    const imageOnLeft = section.imagePosition === "left";
                    const imageUrl = section.imageUrl as string | undefined;
                    const imageAlt = (section.imageAlt as string | undefined) || "";

                    const wrapperClasses = [
                      "grid gap-4 md:grid-cols-2 items-center",
                      sectionWidthClasses(section.width as SectionWidth),
                      "rounded-2xl px-4 md:px-5 mt-2",
                      sectionSpacingClasses(section.spacing as SectionSpacing),
                      sectionBorderClasses(section.borderStyle as SectionBorder, section.borderThickness as SectionBorderThickness),
                      sectionTextAlignClass(section.alignment),
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const alignedStyle = {
                      ...buildSectionStyle(section),
                      ...sectionTextAlign(section.alignment),
                    };

                    return (
                      <section key={idx} className={wrapperClasses} style={alignedStyle}>
                        {imageOnLeft && imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt={imageAlt} className="rounded-2xl shadow-sm" />
                        )}

                        <div
                          className={`text-sm md:text-[15px] leading-relaxed text-gray-800 space-y-3 ${sectionTextAlignClass(section.alignment)}`}
                          style={sectionTextAlign(section.alignment)}
                        >
                          <PortableText value={normalizePortableTextValue(section.body)} components={portableTextComponents} />
                        </div>

                        {!imageOnLeft && imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt={imageAlt} className="rounded-2xl shadow-sm" />
                        )}
                      </section>
                    );
                  }

                  case "topicSection": {
                    const wrapperClasses = [
                      sectionWidthClasses(section.width as SectionWidth),
                      "rounded-2xl px-4 md:px-6 mt-2",
                      sectionSpacingClasses(section.spacing as SectionSpacing),
                      sectionBorderClasses(section.borderStyle as SectionBorder, section.borderThickness as SectionBorderThickness),
                      sectionTextAlignClass(section.alignment),
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const alignedStyle = { ...buildSectionStyle(section), ...sectionTextAlign(section.alignment) };

                    const content = (
                      <section key={idx} className={wrapperClasses} style={alignedStyle}>
                        {section.topicLabel && (
                          <div className={`mb-1 flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase opacity-80 ${topicLabelJustifyClass(section.alignment)}`}>
                            {section.icon && <span>{section.icon}</span>}
                            <span>{section.topicLabel}</span>
                          </div>
                        )}

                        {section.title && (
                          <h2 className="text-emerald-900 mb-2 leading-tight" style={sectionTitleStyle(section)}>
                            {section.title}
                          </h2>
                        )}

                        {section.body && (
                          <div
                            className={`text-sm md:text-[15px] leading-relaxed text-gray-800 space-y-3 ${sectionTextAlignClass(section.alignment)}`}
                          >
                            <PortableText value={normalizePortableTextValue(section.body)} components={portableTextComponents} />
                          </div>
                        )}
                      </section>
                    );

                    return (
                      <React.Fragment key={idx}>
                        {section.showDividerAbove && <div className="border-t border-emerald-100 my-4" />}
                        {content}
                        {section.showDividerBelow && <div className="border-t border-emerald-100 my-4" />}
                      </React.Fragment>
                    );
                  }

                  default:
                    return null;
                }
              })}
            </div>
          )}

          <footer className="pt-4 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-900/70">
            <span>Prepared by the Cypressdale HOA Events team.</span>
            <Link
              href="/events"
              className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:text-emerald-900 hover:underline"
            >
              <span>{"<-"}</span>
              <span>Back to all events</span>
            </Link>
          </footer>
        </article>
        {showRightSidebar && (
          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-emerald-900">Calendar</h2>
              <p className="mt-2 text-xs text-emerald-800/80">
                Browse all upcoming events in the full community calendar.
              </p>
              <Link
                href="/events"
                className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
              >
                <span>Open events calendar</span>
                <span>{"->"}</span>
              </Link>
            </div>

            <NewsLetterSignup />
          </aside>
        )}
        </section>
      </div>
    </div>
  );
}

