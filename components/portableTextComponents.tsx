// src/components/portableTextComponents.tsx
import React, { ReactNode } from 'react';
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
  <span className="font-semibold text-gray-900">{children}</span>
);

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
  },
};
