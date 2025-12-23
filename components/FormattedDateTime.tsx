'use client';

import * as React from 'react';

const DISPLAY_TZ = 'America/Chicago';

export function FormattedDateTime({
  value,
  withTime = true,
}: {
  value?: string;
  withTime?: boolean;
}) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime
      ? { hour: 'numeric' as const, minute: '2-digit' as const }
      : {}),
  });

  return <>{fmt.format(d)}</>;
}
