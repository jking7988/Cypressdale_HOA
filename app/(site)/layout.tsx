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
    <html lang="en">
      <body>
        <Nav />
        <main className="container py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
