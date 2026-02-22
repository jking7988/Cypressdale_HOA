// src/components/portableTextComponents.tsx
import React, { ReactNode } from 'react';
import { stegaClean } from 'next-sanity';
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
    textStyle: TextStyleMark,
    textColor: TextColorMark,
    textSize: TextSizeMark,
    textWeight: TextWeightMark,
  },
};
