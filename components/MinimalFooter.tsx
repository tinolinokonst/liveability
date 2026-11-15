import Link from "next/link";

/** One-line footer for the signed-in app and auth pages (the full one is for marketing pages) */
export default function MinimalFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ backgroundColor: "#0f0f0f", borderTop: "1px solid #1a1a1a" }}
    >
      <p className="mx-auto max-w-6xl px-6 pt-4 text-xs text-[#6b6b6b]">
        &copy; {year} Liveability ·{" "}
        <Link href="/privacy" className="transition-colors hover:text-[#f97316]">Privacy</Link>
        {" "}·{" "}
        <Link href="/terms" className="transition-colors hover:text-[#f97316]">Terms</Link>
      </p>
    </footer>
  );
}
