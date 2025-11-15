import { Mail } from 'lucide-react';
import { CONTACTS, ContactRole } from '@/lib/contact';

type Props = {
  role: ContactRole;
  className?: string;
  showIcon?: boolean;
};

export function ContactLink({ role, className, showIcon = true }: Props) {
  const contact = CONTACTS[role];
  if (!contact) return null;

  const baseClasses =
    'inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:text-emerald-900 hover:underline';
  const combinedClassName = className
    ? `${baseClasses} ${className}`
    : baseClasses;

  return (
    <a
      href={`mailto:${contact.email}`}
      className={combinedClassName}
    >
      {showIcon && <Mail className="h-4 w-4" />}
      <span>{contact.label}</span>
    </a>
  );
}
