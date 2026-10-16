import { PortableText, type PortableTextBlockComponent, type PortableTextComponents } from '@portabletext/react';
import type { ReactNode } from 'react';
import { portableTextComponents, normalizePortableTextValue } from '@/components/portableTextComponents';
import { blockTextAlignment } from '@/lib/member-hub/text-alignment';
import ContentText from './ContentText';

const TitleBlock: PortableTextBlockComponent = ({ children, value }) => {
  const styles: Record<string, string> = { h1: 'text-3xl', h2: 'text-2xl', h3: 'text-xl', blockquote: 'italic' };
  return <span className={`block whitespace-break-spaces ${styles[value.style || 'normal'] || ''}`} style={{ textAlign: blockTextAlignment(value) }}>{children}</span>;
};

// Keep title formatting inside one semantic heading rather than nesting headings or paragraphs.
const titleComponents: Partial<PortableTextComponents> = {
  ...portableTextComponents,
  block: TitleBlock,
  list: ({ children }) => <span className="block pl-6" style={{ counterReset: 'list-item' }}>{children}</span>,
  listItem: ({ children, value }) => <span style={{ display: 'list-item', listStyleType: value.listItem === 'number' ? 'decimal' : 'disc', textAlign: blockTextAlignment(value) }}>{children}</span>,
  marks: { ...portableTextComponents.marks, strong: ({ children }: { children?: ReactNode }) => <strong>{children}</strong> },
};

export default function RichTitle({ title, value, className }: { title: string; value?: unknown; className?: string }) {
  return <h1 className={className} style={{ overflowWrap: 'anywhere' }}>
    {Array.isArray(value) ? <PortableText value={normalizePortableTextValue(value)} components={titleComponents} /> : <ContentText>{title}</ContentText>}
  </h1>;
}
