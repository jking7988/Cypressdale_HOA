// app/(site)/events/[id]/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { groq } from "next-sanity";
import React from "react";
import { sanityFetch } from "@/lib/live";
import { PortableText } from "@portabletext/react";
import { portableTextComponents } from "@/components/portableTextComponents";
import { NewsLetterSignup } from "@/components/NewsLetterSignup";
import { CalendarDays, MapPin, Users, FileText } from "lucide-react";
import { FormattedDateTime } from "@/components/FormattedDateTime";

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
type ColorField = { hex?: string };

type BaseSection = {
  backgroundColor?: ColorField;
  backgroundColorEnd?: ColorField;
  gradientDirection?: string;
  borderColor?: ColorField;
  backgroundImageUrl?: string;
  backgroundImageOpacity?: number;
};

function sectionWidthClasses(width: SectionWidth) {
  switch (width) {
    case "narrow":
      return "max-w-2xl mx-auto";
    case "wide":
      return "max-w-5xl mx-auto";
    case "full":
      return "mx-[-1rem] md:mx-[-2rem]";
    default:
      return "";
  }
}

function sectionSpacingClasses(spacing: SectionSpacing) {
  switch (spacing) {
    case "tight":
      return "py-2 md:py-3";
    case "spacious":
      return "py-6 md:py-8";
    default:
      return "py-4 md:py-5";
  }
}

function sectionBorderClasses(border: SectionBorder) {
  switch (border) {
    case "none":
      return "border-none shadow-none";
    case "strong":
      return "border border-emerald-300 shadow-md";
    case "subtle":
    default:
      return "border border-emerald-100 shadow-sm";
  }
}

function buildSectionStyle(section: BaseSection): React.CSSProperties {
  const style: React.CSSProperties = {};

  const bg = section.backgroundColor?.hex;
  const bgEnd = section.backgroundColorEnd?.hex;
  const dir = section.gradientDirection || "to bottom";

  if (bg && bgEnd) {
    style.backgroundImage = `linear-gradient(${dir}, ${bg}, ${bgEnd})`;
  } else if (bg) {
    style.backgroundColor = bg;
  }

  if (section.borderColor?.hex) {
    style.borderColor = section.borderColor.hex;
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

function isSameDayInTz(a: string, b: string, timeZone = "America/Chicago") {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return fmt.format(da) === fmt.format(db);
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
  const hasEnd = !!event.endDate && !Number.isNaN(new Date(event.endDate).getTime());

  const sameDay =
    !!event.startDate && !!event.endDate ? isSameDayInTz(event.startDate, event.endDate) : false;

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
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-emerald-900">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="font-medium">
                    {!hasStart ? (
                      "Date TBA"
                    ) : !hasEnd ? (
                      <FormattedDateTime value={event.startDate} />
                    ) : sameDay ? (
                      <>
                        <FormattedDateTime value={event.startDate} /> - {formatTimeOnly(event.endDate as string)}
                      </>
                    ) : (
                      <>
                        <FormattedDateTime value={event.startDate} /> - <FormattedDateTime value={event.endDate} />
                      </>
                    )}
                  </span>
                </div>

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

          {event.excerpt && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
              <PortableText value={event.excerpt} components={portableTextComponents} />
            </section>
          )}

          {event.body && (
            <section className="text-sm md:text-[15px] leading-relaxed text-gray-800">
              <div className="md:border-l md:border-emerald-100 md:pl-6 space-y-3">
                <PortableText value={event.body} components={portableTextComponents} />
              </div>
            </section>
          )}

          {!event.body && event.description && (
            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-semibold text-emerald-950">About this event</h2>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm md:text-[15px] text-emerald-900 leading-relaxed">
                {event.description.split("\n").map((line, idx) => (
                  <p key={idx} className={idx > 0 ? "mt-2" : undefined}>
                    {line}
                  </p>
                ))}
              </div>
            </section>
          )}

          {event.sections && event.sections.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-emerald-50">
              {event.sections.map((section: any, idx: number) => {
                switch (section._type) {
                  case "textSection": {
                    const alignment =
                      section.alignment === "center"
                        ? "text-center"
                        : section.alignment === "right"
                        ? "text-right"
                        : "text-left";

                    const wrapperClasses = [
                      alignment,
                      sectionWidthClasses(section.width as SectionWidth),
                      "rounded-2xl px-4 md:px-6 mt-2",
                      sectionSpacingClasses(section.spacing as SectionSpacing),
                      sectionBorderClasses(section.borderStyle as SectionBorder),
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <section key={idx} className={wrapperClasses} style={buildSectionStyle(section)}>
                        {section.title && <h2 className="text-lg font-semibold text-emerald-900 mb-2">{section.title}</h2>}
                        {section.body && (
                          <div className="text-sm md:text-[15px] leading-relaxed text-gray-800 space-y-3">
                            <PortableText value={section.body} components={portableTextComponents} />
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
                      sectionBorderClasses(section.borderStyle as SectionBorder),
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <section key={idx} className={wrapperClasses} style={buildSectionStyle(section)}>
                        {imageOnLeft && imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt={imageAlt} className="rounded-2xl shadow-sm" />
                        )}

                        <div className="text-sm md:text-[15px] leading-relaxed text-gray-800 space-y-3">
                          <PortableText value={section.body} components={portableTextComponents} />
                        </div>

                        {!imageOnLeft && imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt={imageAlt} className="rounded-2xl shadow-sm" />
                        )}
                      </section>
                    );
                  }

                  case "topicSection": {
                    const alignment =
                      section.alignment === "center"
                        ? "text-center"
                        : section.alignment === "right"
                        ? "text-right"
                        : "text-left";

                    const wrapperClasses = [
                      alignment,
                      sectionWidthClasses(section.width as SectionWidth),
                      "rounded-2xl px-4 md:px-6 mt-2",
                      sectionSpacingClasses(section.spacing as SectionSpacing),
                      sectionBorderClasses(section.borderStyle as SectionBorder),
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const content = (
                      <section key={idx} className={wrapperClasses} style={buildSectionStyle(section)}>
                        {section.topicLabel && (
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase opacity-80 justify-start">
                            {section.icon && <span>{section.icon}</span>}
                            <span>{section.topicLabel}</span>
                          </div>
                        )}

                        {section.title && <h2 className="text-lg font-semibold text-emerald-900 mb-2">{section.title}</h2>}

                        {section.body && (
                          <div className="text-sm md:text-[15px] leading-relaxed text-gray-800 space-y-3">
                            <PortableText value={section.body} components={portableTextComponents} />
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
