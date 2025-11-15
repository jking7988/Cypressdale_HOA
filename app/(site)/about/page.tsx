import { ContactLink } from '@/components/ContactLink';
import { ContactCards } from '@/components/ContactCards';
import { AccSpectrumNotice } from '@/components/AccSpectrumNotice';

export default function AboutPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <header className="space-y-2">
        <h1 className="h1">About Cypressdale HOA</h1>
        <p className="muted max-w-2xl">
          Learn more about the Cypressdale community association, how it operates,
          and how to get in touch with the right people for your questions.
        </p>
      </header>

      {/* Main content */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)] items-start">
        {/* Left: overview */}
        <div className="card space-y-3">
          <h2 className="h2 text-lg">Who we are</h2>
          <p className="text-sm text-gray-700">
            Cypressdale is a deed-restricted community. The Homeowners
            Association (HOA) works to maintain common areas, support community
            standards, and communicate important information to residents.
          </p>
          <p className="text-sm text-gray-700">
            The HOA is led by a volunteer Board of Directors elected by
            homeowners. The Board works with a professional management company
            to handle day-to-day operations such as billing, maintenance
            coordination, and vendor contracts.
          </p>
          <p className="text-sm text-gray-700">
            For general questions about the neighborhood or this website, you
            can reach us at{' '}
            <ContactLink role="general" showIcon />
            .
          </p>

          {/* ACC via Spectrum */}
          <AccSpectrumNotice />
        </div>

        {/* Right: contact roles/cards */}
        <div className="card space-y-3">
          <h2 className="h2 text-lg">Who to contact</h2>
          <p className="text-sm text-gray-700">
            Use the contacts below so your question goes directly to the right
            group (board, management, pool, etc.).
          </p>
          <ContactCards />
        </div>
      </section>
    </div>
  );
}
