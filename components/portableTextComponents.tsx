// src/components/portableTextComponents.tsx
import React, { ReactNode } from 'react';
import { stegaClean } from 'next-sanity';
import type {TypedObject} from '@portabletext/types';
// If this type import causes issues, you can delete the line and the type annotation below.
// import type { PortableTextComponents } from '@portabletext/react';

type BlockProps = { children?: ReactNode };

const NormalBlock = ({ children }: BlockProps) => (
  <p className="mb-3 leading-relaxed text-gray-800 whitespace-pre-line">
    {children}
  </p>
);

const H1Block = ({ children }: BlockProps) => (
  <h1 className="mt-6 mb-4 text-xl font-semibold text-gray-900">
    {children}
  </h1>
);

const H2Block = ({ children }: BlockProps) => (
  <h2 className="mt-5 mb-3 text-lg font-semibold text-gray-900">
    {children}
  </h2>
);

const H3Block = ({ children }: BlockProps) => (
  <h3 className="mt-4 mb-2 text-base font-semibold text-gray-900">
    {children}
  </h3>
);

const BulletList = ({ children }: BlockProps) => (
  <ul className="mb-4 ml-5 list-disc space-y-1 text-gray-800">
    {children}
  </ul>
);

const NumberList = ({ children }: BlockProps) => (
  <ol className="mb-4 ml-5 list-decimal space-y-1 text-gray-800">
    {children}
  </ol>
);

const BulletItem = ({ children }: BlockProps) => (
  <li className="leading-relaxed">{children}</li>
);

const NumberItem = ({ children }: BlockProps) => (
  <li className="leading-relaxed">{children}</li>
);

type PortableTextSpan = {
  _type?: string;
  marks?: string[];
  text?: string;
};

type PortableTextMarkDef = {
  _key?: string;
  _type?: string;
  color?: string | { hex?: string };
  size?: number | string;
  weight?: number | string;
};

type PortableTextBlock = {
  _type?: string;
  children?: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
};

type PortableTextValue = TypedObject[];

export function normalizePortableTextValue(value: unknown): PortableTextValue {
  if (!Array.isArray(value)) return [];

  return value.map((block) => {
    if (!block || block._type !== "block" || !Array.isArray(block.children)) return block;
    const markDefs = Array.isArray(block.markDefs) ? [...block.markDefs] : [];
    if (!markDefs.length) return block;

    const legacyByKey = new Map(
      markDefs
        .filter((d) => d?._key && (d._type === "textColor" || d._type === "textSize" || d._type === "textWeight"))
        .map((d) => [d._key as string, d]),
    );

    if (!legacyByKey.size) return block;

    const textStyleByKey = new Map(
      markDefs.filter((d) => d?._key && d._type === "textStyle").map((d) => [d._key as string, d]),
    );

    const children = block.children.map((child: PortableTextSpan) => {
      if (!child?.marks?.length) return child;
      const marks = [...child.marks];
      const styleKey = marks.find((m: string) => textStyleByKey.has(m));
      const legacyKeys = marks.filter((m: string) => legacyByKey.has(m));
      if (!legacyKeys.length) return child;

      if (styleKey) {
        return { ...child, marks: marks.filter((m: string) => !legacyByKey.has(m)) };
      }

      let color: PortableTextMarkDef["color"] | undefined;
      let size: PortableTextMarkDef["size"] | undefined;
      let weight: PortableTextMarkDef["weight"] | undefined;

      for (const k of legacyKeys) {
        const def = legacyByKey.get(k);
        if (!def) continue;
        if (def._type === "textColor") color = def.color;
        if (def._type === "textSize") size = def.size;
        if (def._type === "textWeight") weight = def.weight;
      }

      const newKey = `textStyle-${legacyKeys.join("-")}`;
      if (!textStyleByKey.has(newKey)) {
        const merged: PortableTextMarkDef = {_key: newKey, _type: "textStyle"};
        if (typeof color !== "undefined") merged.color = color;
        if (typeof size !== "undefined") merged.size = size;
        if (typeof weight !== "undefined") merged.weight = weight;
        markDefs.push(merged);
        textStyleByKey.set(newKey, merged);
      }

      return {
        ...child,
        marks: [...marks.filter((m) => !legacyByKey.has(m)), newKey],
      };
    });

    const usedMarkKeys = new Set(children.flatMap((c: PortableTextSpan) => c.marks || []));
    const filteredMarkDefs = markDefs.filter((d) => d?._key && usedMarkKeys.has(d._key));

    return {
      ...block,
      children,
      markDefs: filteredMarkDefs,
    };
  }) as PortableTextValue;
}

const StrongMark = ({ children }: BlockProps) => (
  <span className="font-semibold">{children}</span>
);

type TextColorValue = {
  color?: string | { hex?: string };
};

type TextStyleValue = {
  color?: string | { hex?: string };
  size?: number | string;
  weight?: number | string;
};

type LinkValue = {
  href?: string;
  openInNewTab?: boolean;
};

const TextColorMark = ({
  children,
  value,
}: {
  children?: ReactNode;
  value?: TextColorValue;
}) => {
  const raw =
    typeof value?.color === 'string'
      ? value.color
      : value?.color && typeof value.color === 'object'
      ? value.color.hex
      : undefined;

  const color = raw ? stegaClean(raw).trim() : '';
  if (!color) return <>{children}</>;

  return <span style={{ color }}>{children}</span>;
};

type TextSizeValue = {
  size?: number | string;
};

const TextSizeMark = ({
  children,
  value,
}: {
  children?: ReactNode;
  value?: TextSizeValue;
}) => {
  const raw = value?.size;
  const parsed =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw
      ? Number(stegaClean(raw))
      : NaN;

  if (!Number.isFinite(parsed)) return <>{children}</>;
  const clamped = Math.min(64, Math.max(10, parsed));
  return <span style={{ fontSize: `${clamped}px` }}>{children}</span>;
};

type TextWeightValue = {
  weight?: number | string;
};

const TextWeightMark = ({
  children,
  value,
}: {
  children?: ReactNode;
  value?: TextWeightValue;
}) => {
  const raw = value?.weight;
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw
      ? Number(stegaClean(raw))
      : NaN;

  if (!Number.isFinite(parsed)) return <>{children}</>;
  const clamped = Math.min(900, Math.max(100, Math.round(parsed / 100) * 100));
  return <span style={{ fontWeight: clamped }}>{children}</span>;
};

const TextStyleMark = ({
  children,
  value,
}: {
  children?: ReactNode;
  value?: TextStyleValue;
}) => {
  const rawColor =
    typeof value?.color === "string"
      ? value.color
      : value?.color && typeof value.color === "object"
      ? value.color.hex
      : undefined;
  const color = rawColor ? stegaClean(rawColor).trim() : "";

  const rawSize = value?.size;
  const parsedSize =
    typeof rawSize === "number"
      ? rawSize
      : typeof rawSize === "string" && rawSize
      ? Number(stegaClean(rawSize))
      : NaN;

  const rawWeight = value?.weight;
  const parsedWeight =
    typeof rawWeight === "number"
      ? rawWeight
      : typeof rawWeight === "string" && rawWeight
      ? Number(stegaClean(rawWeight))
      : NaN;

  const style: React.CSSProperties = {};
  if (color) style.color = color;
  if (Number.isFinite(parsedSize)) {
    style.fontSize = `${Math.min(64, Math.max(10, parsedSize))}px`;
  }
  if (Number.isFinite(parsedWeight)) {
    style.fontWeight = Math.min(900, Math.max(100, Math.round(parsedWeight / 100) * 100));
  }

  if (!Object.keys(style).length) return <>{children}</>;
  return <span style={style}>{children}</span>;
};

function sanitizeHref(raw?: string) {
  if (!raw) return '';
  const href = stegaClean(raw).trim();
  if (!href) return '';
  if (href.startsWith('/') || href.startsWith('#')) return href;
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  return '';
}

const LinkMark = ({
  children,
  value,
}: {
  children?: ReactNode;
  value?: LinkValue;
}) => {
  const href = sanitizeHref(value?.href);
  if (!href) return <>{children}</>;
  const openInNewTab = value?.openInNewTab ?? true;
  return (
    <a
      href={href}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer nofollow' : undefined}
      className="underline text-emerald-700 hover:text-emerald-800"
    >
      {children}
    </a>
  );
};

// If the type causes an error, remove `: PortableTextComponents`
export const portableTextComponents /* : PortableTextComponents */ = {
  block: {
    normal: NormalBlock,
    h1: H1Block,
    h2: H2Block,
    h3: H3Block,
  },
  list: {
    bullet: BulletList,
    number: NumberList,
  },
  listItem: {
    bullet: BulletItem,
    number: NumberItem,
  },
  marks: {
    strong: StrongMark,
    link: LinkMark,
    textStyle: TextStyleMark,
    textColor: TextColorMark,
    textSize: TextSizeMark,
    textWeight: TextWeightMark,
  },
};
