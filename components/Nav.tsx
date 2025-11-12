import Link from 'next/link';

export default function Nav() {
  return (
    <header className="border-b border-brand-100 bg-brand-50/60 backdrop-blur">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="font-bold text-xl text-brand-700">Cypressdale HOA</Link>
        <nav className="flex gap-4">
          <Link className="hover:text-brand-700 text-brand-600" href="/about">About</Link>
          <Link className="hover:text-brand-700 text-brand-600" href="/news">News</Link>
          <Link className="hover:text-brand-700 text-brand-600" href="/events">Events</Link>
          <Link className="hover:text-brand-700 text-brand-600" href="/documents">Documents</Link>
          <Link href="/studio" className="text-accent-600 hover:text-accent-500 font-medium">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
