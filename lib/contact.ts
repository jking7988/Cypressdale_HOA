// lib/contact.ts

export type ContactRole =
  | 'general'
  | 'board'
  | 'management'
  | 'acc'
  | 'pool';

export type ContactEntry = {
  label: string;
  email: string;
  description?: string;
};

export const CONTACTS: Record<ContactRole, ContactEntry> = {
  general: {
    label: 'General HOA Email',
    email: 'info@cypressdalehoa.com',
    description: 'General questions, dues, notices, or website assistance.',
  },
  board: {
    label: 'Board of Directors',
    email: 'board@cypressdalehoa.com',
    description: 'Questions for the HOA board or community issues.',
  },
  management: {
    label: 'Management / Admin',
    email: 'admin@cypressdalehoa.com',
    description: 'Administrative issues or official documentation.',
  },
  pool: {
    label: 'Pool & Amenities',
    email: 'pool@cypressdalehoa.com',
    description: 'Pool passes, issues, or availability questions.',
  },
};
