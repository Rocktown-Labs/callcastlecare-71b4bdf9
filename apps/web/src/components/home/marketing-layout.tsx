import type { ReactNode } from "react";

import Footer from "./footer";
import Navbar from "./navbar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-[#080c16]">
      <a
        className="absolute left-4 top-4 z-50 -translate-y-24 rounded-lg bg-lime-300 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg transition-transform focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        href="#main-content"
      >
        Skip to main content
      </a>
      <Navbar />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
