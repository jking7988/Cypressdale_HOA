// lib/contact.ts

export type ContactRole =
  | 'general'
  | 'board'
  | 'management'
  | 'pool';

export type ContactEntry = {
  label: string;
  email: string;
  description?: string;
};

const spectrumEmail =
  process.env.SPECTRUM_CONTACT_EMAIL?.trim() ||
  'cypressdalehoa@spectrumam.com';

export const CONTACTS: Record<ContactRole, ContactEntry> = {
  general: {
    label: 'Spectrum HOA Contact',
    email: spectrumEmail,
    description: 'All general questions, dues, notices, or website assistance.',
  },
  board: {
    label: 'Spectrum HOA Contact',
    email: spectrumEmail,
    description: 'Questions for the HOA board or community issues.',
  },
  management: {
    label: 'Spectrum HOA Contact',
    email: spectrumEmail,
    description: 'Administrative issues or official documentation.',
  },
  pool: {
    label: 'Spectrum HOA Contact',
    email: spectrumEmail,
    description: 'Pool passes, issues, or availability questions.',
  },
};
