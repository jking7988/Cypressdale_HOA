import type { ReactNode } from 'react';

export default function ContentText({ children }: { children: ReactNode }) {
  return <span className="content-text" style={{ whiteSpace: 'break-spaces', overflowWrap: 'anywhere' }}>{children}</span>;
}
