// app/(site)/news/[id]/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { groq } from 'next-sanity';
import { client, previewClient } from '@/lib/sanity.client';
import { PortableText } from '@portabletext/react';
import { portableTextComponents } from '@/components/portableTextComponents';
import React from 'react';
import { FormattedDateTime } from '@/components/FormattedDateTime';

type Post = {
  _id: string;
  title: string;
  topic?: string;
  excerpt?: any;
  body?: any;
  _createdAt?: string;
  layoutVariant?: 'standard' | 'narrow' | 'wide';
  showRightSidebar?: boolean;
  sections?: any[];
};

const postByIdQuery = groq`*[
  _type == "post" &&
  (_id == $id || _id == $draftId)
] | order(_id desc)[0]{
  _id,
  title,
  topic,
  excerpt,
  body,
  _createdAt,
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
  }
}`;

const topicInfo: Record<string, { icon: string; label: string; color: string }> = {
  elections: {
    icon: '🗳️',
    label: 'Elections',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  pool: {
    icon: '🌊',
    label: 'Pool Update',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  events: {
    icon: '📅',
    label: 'Community Event',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  maintenance: {
    icon: '🛠️',
    label: 'Maintenance',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  general: {
    icon: '📢',
    label: 'General Update',
    color: 'bg-brand-100 text-brand-800 border-brand-200',
  },
};

const ImportantDateBox = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 flex items-start gap-2">
    <span className="text-lg">⏰</span>
    <div>{children}</div>
  </div>
);

type SectionWidth = 'default' | 'narrow' | 'wide' | 'full' | undefined;
type SectionSpacing = 'tight' | 'normal' | 'spacious' | undefined;
type SectionBorder = 'none' | 'subtle' | 'strong' | undefined;

function sectionWidthClasses(width: SectionWidth) {
  switch (width) {
    case 'narrow':
      return 'max-w-2xl mx-auto';
    case 'wide':
      return 'max-w-5xl mx-auto';
    case 'full':
      return 'mx-[-1rem] md:mx-[-2rem]';
    default:
      return '';
  }
}

function sectionSpacingClasses(spacing: SectionSpacing) {
  switch (spacing) {
    case 'tight':
      return 'py-2 md:py-3';
    case 'spacious':
      return 'py-6 md:py-8';
    default:
      return 'py-4 md:py-5';
  }
}

function sectionBorderClasses(border: SectionBorder) {
  switch (border) {
    case 'none':
      return 'border-none shadow-none';
    case 'strong':
      return 'border border-emerald-300 shadow-md';
    case 'subtle':
    default:
      return 'border border-emerald-100 shadow-sm';
  }
}

type ColorField = { hex?: string };

type BaseSection = {
  backgroundColor?: ColorField;
  backgroundColorEnd?: ColorField;
  gradientDirection?: string;
  borderColor?: ColorField;
  backgroundImageUrl?: string;
  backgroundImageOpacity?: number;
};

function buildSectionStyle(section: BaseSection): React.CSSProperties {
  const style: React.CSSProperties = {};

  const bg = section.backgroundColor?.hex;
  const bgEnd = section.backgroundColorEnd?.hex;
  const dir = section.gradientDirection || 'to bottom';

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
      .join(', ');
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }

  return style;
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewsDetailPage(props: Props) {
  const { id } = await props.params;
  if (!id) return notFound();

  const searchParams = await props.searchParams;
  const draftParam = searchParams?.draft;

  const isDraft =
    typeof draftParam === 'string'
      ? draftParam === '1'
      : Array.isArray(draftParam)
      ? draftParam[0] === '1'
      : false;

  const sanity = isDraft && process.env.SANITY_API_READ_TOKEN ? previewClient : client;

  const draftId = `drafts.${id}`;

  const post = await sanity.fetch<Post | null>(postByIdQuery, { id, draftId });
  if (!post) return notFound();

  const topic = (post.topic && topicInfo[post.topic]) || topicInfo['general'];

  const layout = post.layoutVariant || 'standard';
  const widthClass =
    layout === 'narrow' ? 'max-w-2xl' : layout === 'wide' ? 'max-w-5xl' : 'max-w-3xl';

  return (
    <div className="relative min-h-[calc(100vh-5rem)]">
      <div
        className="fixed inset-0 -z-30 bg-center bg-repeat opacity-[0.72]"
        style={{
          backgroundImage: "url('/images/newsletter-bg.png')",
          backgroundSize: '512px 512px',
          backgroundAttachment: 'fixed',
        }}
      />
      <div className="fixed inset-0 -z-20 bg-white/92 backdrop-blur-[1.5px]" />

      <div className={`relative mx-auto px-4 py-6 md:py-8 space-y-4 ${widthClass}`}>
        <div className="mb-1">
          <Link href="/news" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
            <span>←</span>
            <span>Back to all news</span>
          </Link>
        </div>

        <article className="rounded-3xl border border-emerald-50 bg-white/95 shadow-sm backdrop-blur-[1px] px-5 py-6 md:px-8 md:py-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-50 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">{topic.icon}</span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Cypressdale HOA — News &amp; Updates
              </p>
            </div>

            {post._createdAt && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-[11px] font-medium text-emerald-800">
                <span className="text-[12px]">🗓️</span>
                <FormattedDateTime value={post._createdAt} />
              </span>
            )}
          </div>

          <div className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 border rounded-full w-fit mb-1 shadow-sm ${topic.color}`}>
            <span>{topic.icon}</span>
            <span>{topic.label}</span>
          </div>

          <h1 className="text-xl md:text-2xl font-semibold leading-snug text-brand-900">{post.title}</h1>

          {post.excerpt && (
            <ImportantDateBox>
              <PortableText value={post.excerpt} components={portableTextComponents} />
            </ImportantDateBox>
          )}

          {post.body && (
            <section className="text-sm md:text-[15px] leading-relaxed text-gray-800">
              <div className="md:border-l md:border-emerald-100 md:pl-6 space-y-3">
                <PortableText value={post.body} components={portableTextComponents} />
              </div>
            </section>
          )}

          {post.sections && post.sections.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-emerald-50">
              {post.sections.map((section: any, idx: number) => {
                switch (section._type) {
                  case 'textSection': {
                    const alignment =
                      section.alignment === 'center'
                        ? 'text-center'
                        : section.alignment === 'right'
                        ? 'text-right'
                        : 'text-left';

                    const widthClasses = sectionWidthClasses(section.width as SectionWidth);
                    const spacingClasses = sectionSpacingClasses(section.spacing as SectionSpacing);
                    const borderClasses = sectionBorderClasses(section.borderStyle as SectionBorder);

                    const wrapperClasses = [
                      alignment,
                      widthClasses,
                      'rounded-2xl px-4 md:px-6 mt-2',
                      spacingClasses,
                      borderClasses,
                    ]
                      .filter(Boolean)
                      .join(' ');

                    const style = buildSectionStyle(section);

                    return (
                      <section key={idx} className={wrapperClasses} style={style}>
                        {section.title && <h2 className="text-lg font-semibold text-brand-900 mb-2">{section.title}</h2>}
                        {section.body && (
                          <div className="text-sm md:text-[15px] leading-relaxed text-gray-800 space-y-3">
                            <PortableText value={section.body} components={portableTextComponents} />
                          </div>
                        )}
                      </section>
                    );
                  }

                  case 'imageWithText': {
                    const imageOnLeft = section.imagePosition === 'left';
                    const imageUrl = section.imageUrl as string | undefined;
                    const imageAlt = (section.imageAlt as string | undefined) || '';

                    const widthClasses = sectionWidthClasses(section.width as SectionWidth);
                    const spacingClasses = sectionSpacingClasses(section.spacing as SectionSpacing);
                    const borderClasses = sectionBorderClasses(section.borderStyle as SectionBorder);

                    const wrapperClasses = [
                      'grid gap-4 md:grid-cols-2 items-center',
                      widthClasses,
                      'rounded-2xl px-4 md:px-5 mt-2',
                      spacingClasses,
                      borderClasses,
                    ]
                      .filter(Boolean)
                      .join(' ');

                    const style = buildSectionStyle(section);

                    return (
                      <section key={idx} className={wrapperClasses} style={style}>
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

                  case 'topicSection': {
                    const alignment =
                      section.alignment === 'center'
                        ? 'text-center'
                        : section.alignment === 'right'
                        ? 'text-right'
                        : 'text-left';

                    const widthClasses = sectionWidthClasses(section.width as SectionWidth);
                    const spacingClasses = sectionSpacingClasses(section.spacing as SectionSpacing);
                    const borderClasses = sectionBorderClasses(section.borderStyle as SectionBorder);

                    const wrapperClasses = [
                      alignment,
                      widthClasses,
                      'rounded-2xl px-4 md:px-6 mt-2',
                      spacingClasses,
                      borderClasses,
                    ]
                      .filter(Boolean)
                      .join(' ');

                    const style = buildSectionStyle(section);

                    const content = (
                      <section key={idx} className={wrapperClasses} style={style}>
                        {section.topicLabel && (
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase opacity-80 justify-start">
                            {section.icon && <span>{section.icon}</span>}
                            <span>{section.topicLabel}</span>
                          </div>
                        )}

                        {section.title && <h2 className="text-lg font-semibold text-brand-900 mb-2">{section.title}</h2>}

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

          <footer className="mt-4 pt-4 border-t border-emerald-50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
            <span>Prepared by the Cypressdale HOA Board of Directors</span>
            {post._createdAt && (
              <span>
                Published <FormattedDateTime value={post._createdAt} />
              </span>
            )}
          </footer>
        </article>
      </div>
    </div>
  );
}
