'use client';

const SPECTRUM_PORTAL_URL = 'https://spectrumam.com/homeowners/';

export function AccSpectrumNotice() {
  return (
    <div className="rounded-2xl bg-white/90 border border-emerald-50 shadow-md px-4 py-4 space-y-2 text-sm text-gray-700">
      <h3 className="text-sm font-semibold text-emerald-900">
        Architectural (ACC) Requests
      </h3>
      <p>
        All Architectural Control Committee (ACC) requests are submitted through our
        management company, Spectrum.
      </p>
      <p>
        Please go to the Spectrum homeowner portal, log in, and find the ACC / architectural
        request section to submit your request.
      </p>
      <a
        href={SPECTRUM_PORTAL_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-xs font-medium text-white shadow-md hover:bg-emerald-800 hover:-translate-y-[1px] transition"
      >
        Go to Spectrum homeowner portal
      </a>
    </div>
  );
}
