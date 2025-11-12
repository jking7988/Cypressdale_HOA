export default function Footer() {
  return (
    <footer className="border-t border-brand-100 mt-10 bg-brand-50/40">
      <div className="container py-6 text-sm text-brand-700">
        © {new Date().getFullYear()} Cypressdale HOA. All rights reserved.
      </div>
    </footer>
  );
}
