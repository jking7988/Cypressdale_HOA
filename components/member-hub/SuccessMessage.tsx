'use client';

import { useEffect, useState } from 'react';

type Notice = { success?: string };

export default function SuccessMessage({ notice }: { notice: Notice }) {
  const [dismissed, setDismissed] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice.success) return;
    const timer = window.setTimeout(() => setDismissed(notice), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  if (!notice.success || dismissed === notice) return null;
  return <p className="hub-message hub-success" role="status">{notice.success}</p>;
}
