import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="text-lg font-bold text-gray-900">
              Liveability
            </Link>
            <p className="mt-2 max-w-xs text-sm text-gray-600">
              Data-driven quality-of-life scores for neighborhoods and addresses
              in Columbus, Ohio.
            </p>
          </div>

          {/* General links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              General
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-gray-900">
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-use"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/cookie-policy"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Spare column for future links (Contact, Methodology, etc.) */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Resources
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/how-it-works"
                  className="text-gray-600 hover:text-gray-900"
                >
                  How It Works
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-500">
          &copy; {year} Liveability. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
