import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fresume — Truth-Grounded AI Resume Builder",
  description: "Build your career with Fresume — a highly-polished, ATS-safe, verified-evidence resume editor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body className="bg-slate-950 text-slate-100 font-body min-h-screen flex flex-col antialiased">
        {/* Sleek Fresume Glassmorphic Navbar */}
        <header className="border-b border-slate-900 bg-slate-950/75 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 hover:opacity-90 transition-all cursor-pointer">
              Fresume
            </Link>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-amber-400 uppercase tracking-wider font-semibold">
              Truth-Grounded AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">India & International ATS Ready</p>
            </div>
            <Link
              href="/app"
              className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 rounded-lg font-mono text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Go to App</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </header>

        {/* Core application view */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
