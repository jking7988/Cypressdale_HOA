import '../../styles/globals.css';
import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Cypressdale HOA',
  description: 'Community info, events, and documents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-brand-50 text-brand-900 overflow-x-hidden">
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="container flex-1 py-8">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
