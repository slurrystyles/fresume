import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Groundwork — Truth-Grounded AI Resume Builder",
  description: "Lay the groundwork for your career with a highly-polished, ATS-safe, verified-evidence resume editor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink font-body min-h-screen flex flex-col antialiased">
        {/* Simple Groundwork Navbar */}
        <header className="border-b border-line bg-surface sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-bold tracking-tight text-ink">
              Groundwork
            </span>
            <span className="font-mono text-xs px-2 py-0.5 bg-paper rounded border border-line text-evidence uppercase tracking-wider font-semibold">
              Truth-Grounded AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-ink/60 font-mono">India & International ATS Ready</p>
            </div>
          </div>
        </header>

        {/* Global Warning Banner for Setup (shows users how to configure keys) */}
        <div className="bg-evidence/10 border-b border-evidence/20 px-6 py-2.5 text-xs font-mono flex items-center justify-between text-ink/80 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-evidence animate-pulse"></span>
            <span><strong>Playground Mode Active</strong> — Groundwork operates fully on LocalStorage and local fallbacks if Supabase & Gemini are not connected.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>To connect cloud database & AI: configure <code>GEMINI_API_KEY</code> and <code>NEXT_PUBLIC_SUPABASE_URL</code> in settings.</span>
          </div>
        </div>

        {/* Core application view */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
